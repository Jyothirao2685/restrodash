'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { usePosSettingsStore } from '@/store/pos-settings';
import { Settings, Lock } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import api from '@/lib/api';
import axios from 'axios';
import toast from 'react-hot-toast';
import { normalizeOptionalPhone } from '@/lib/phone';
import { useConfirm } from '@/hooks/use-confirm';
import { MasterPinPrompt } from '@/components/settings/MasterPinPrompt';
import { HealthCheckDialog } from '@/components/settings/HealthCheckDialog';
import { InitializeDatabaseDialog } from '@/components/settings/InitializeDatabaseDialog';
import { CurrencyResetDialog } from '@/components/settings/CurrencyResetDialog';
import { TaxConfigurationPanel } from '@/components/settings/TaxConfigurationPanel';
import { GeneralSettingsTab, type BusinessForm, type InvoiceResetPeriod, type OrderNumberForm } from '@/components/settings/GeneralSettingsTab';
import {
  DatabaseSettingsTab,
  type BackupInfo,
  type GoogleDriveStatus,
  type GoogleDriveDestination,
  type GoogleDriveRemoteBackup,
  type ImportPayload,
  type MasterPinStatus,
  type PinGate,
} from '@/components/settings/DatabaseSettingsTab';

// Kept in code but commented out in UI per instruction:
// import { PaymentMethodsSettings } from '@/components/settings/PaymentMethodsSettings';
// import { PrintersSettingsTab } from '@/components/settings/PrintersSettingsTab';

import type { HealthCheckReport } from '@/types/electron';
import { useTranslations } from 'use-intl';
import { tenantCan } from '@/lib/permissions';

const RESTORE_CONFIRMATION = 'RESTORE BACKUP';

function isRequestCancelled(error: unknown): boolean {
  return axios.isCancel(error);
}

function sanitizeStoredNumberPrefix(value: string | null | undefined): string {
  return (value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function SettingsNavItem({
  label, value, active, onClick, indent, attention,
}: {
  label: string;
  value: string;
  active: string;
  onClick: (v: string) => void;
  indent?: boolean;
  attention?: boolean;
}) {
  const isActive = active === value;
  return (
    <button
      onClick={() => onClick(value)}
      className={[
        'flex items-center w-full min-w-0 text-start text-sm rounded-md py-1.5 transition-colors',
        indent ? 'ps-5 pe-2 border-s-2 ms-1 text-xs md:ms-0' : 'px-3',
        isActive
          ? 'bg-brand/10 text-brand font-semibold' + (indent ? ' border-brand' : '')
          : 'text-muted-foreground hover:bg-muted hover:text-foreground' + (indent ? ' border-transparent' : ''),
      ].join(' ')}
    >
      <span className="min-w-0 truncate">{label}</span>
      {attention && <span className="ms-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white" aria-label="Action required">1</span>}
    </button>
  );
}

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const tRestore = useTranslations('restore');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentTenant, updateCurrentTenant } = useAuthStore();
  const posSettings = usePosSettingsStore();
  const { confirm, ConfirmDialog } = useConfirm();

  const isOwner = tenantCan(currentTenant, 'database.manage') || currentTenant?.role === 'owner';
  const isAdmin = isOwner || currentTenant?.role === 'admin' || currentTenant?.role === 'manager';
  const canManageDatabase = isOwner;
  const canViewTaxConfiguration = tenantCan(currentTenant, 'tax-packs.view-test');
  const canManageTaxPacks = tenantCan(currentTenant, 'tax-packs.manage');

  const requestedTabParam = searchParams?.get('tab') || 'store';
  const requestedTab = ['store', 'tax', 'data', 'receipts-printers', 'payments'].includes(requestedTabParam)
    ? requestedTabParam
    : 'store';
  const requestedAction = searchParams?.get('action');

  const [activeTab, setActiveTab] = useState(requestedTab);
  const activeTabRef = useRef(activeTab);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveTab(requestedTab);
  }, [requestedTab]);

  const handleSettingsTabChange = (value: string) => {
    setActiveTab(value);
    const nextParams = new URLSearchParams(searchParams?.toString());
    if (value === 'store') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', value);
    }
    const query = nextParams.toString();
    router.replace(query ? `/settings?${query}` : '/settings');
  };

  // ── Store Details & Order Numbering State ─────────────────────────────────
  const [form, setForm] = useState<BusinessForm>({
    businessName: currentTenant?.business_name || '',
    countryCode: currentTenant?.country || '',
    timezone: currentTenant?.timezone || '',
    businessDayStartTime: currentTenant?.business_day_start_time || '00:00',
    currency: currentTenant?.currency || '',
    billingType: 'postpaid',
    tablesRequired: true,
    taxRegistered: false,
    taxRegistrationNumber: '',
    businessAddress: '',
    businessPhone: '',
    instagramHandle: '',
    currencyDisplay: 'rial',
    numberDigits: 'locale',
    calendar: 'locale',
  });
  const [savedBusiness, setSavedBusiness] = useState<BusinessForm>(form);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [taxIdFormat, setTaxIdFormat] = useState<{ pattern: string; description: string } | null>(null);
  const [taxIdFormatCountryCode, setTaxIdFormatCountryCode] = useState('');
  const [currencyResetTarget, setCurrencyResetTarget] = useState('');

  const [orderNumberForm, setOrderNumberForm] = useState<OrderNumberForm>({
    prefix: 'ORD',
    includeDate: true,
    resetDaily: true,
    invoicePrefix: 'INV',
    invoiceIncludePeriod: true,
    invoiceResetPeriod: 'daily',
    invoiceFinancialYearStartMonth: 4,
    invoiceFinancialYearStartDay: 1,
  });
  const [savedOrderNumberForm, setSavedOrderNumberForm] = useState<OrderNumberForm>(orderNumberForm);
  const [savingOrderNumbering, setSavingOrderNumbering] = useState(false);

  const hydrationTouchVersions = useRef(new Map<string, number>());
  const markHydrationTouched = (field: string) => {
    hydrationTouchVersions.current.set(field, (hydrationTouchVersions.current.get(field) || 0) + 1);
  };

  // ── Load Store Settings on Mount ──────────────────────────────────────────
  const loadBusiness = useCallback(async () => {
    try {
      const { data: d } = await api.get('/settings/business');
      const loaded: BusinessForm = {
        businessName: d.business_name || '',
        countryCode: d.country || '',
        timezone: d.timezone || '',
        businessDayStartTime: d.business_day_start_time || '00:00',
        currency: d.currency || '',
        billingType: d.billing_type === 'prepaid' ? 'prepaid' : 'postpaid',
        tablesRequired: true,
        taxRegistered: d.tax_registered === 'true' || d.tax_registered === true || d.tax_registered === 1,
        taxRegistrationNumber: d.tax_registration_number || '',
        businessAddress: d.business_address || '',
        businessPhone: d.business_phone || '',
        instagramHandle: d.instagram_handle || '',
        currencyDisplay: d.currency_display || 'rial',
        numberDigits: d.number_digits || 'locale',
        calendar: d.calendar || 'locale',
      };
      setForm(loaded);
      setSavedBusiness(loaded);
      setTaxIdFormat(d.tax_id_format || null);
      setTaxIdFormatCountryCode(loaded.countryCode);
    } catch (err) {
      console.error('Failed to load store settings:', err);
    }

    try {
      const { data: ord } = await api.get('/settings/order-numbering');
      const loadedOrder: OrderNumberForm = {
        prefix: ord.order_number_prefix == null ? 'ORD' : sanitizeStoredNumberPrefix(ord.order_number_prefix),
        includeDate: ord.order_number_include_date !== false,
        resetDaily: ord.order_number_reset_daily !== false,
        invoicePrefix: ord.invoice_number_prefix == null ? 'INV' : sanitizeStoredNumberPrefix(ord.invoice_number_prefix),
        invoiceIncludePeriod: ord.invoice_number_include_period !== false,
        invoiceResetPeriod: (ord.invoice_number_reset_period || 'daily') as InvoiceResetPeriod,
        invoiceFinancialYearStartMonth: Number(ord.invoice_financial_year_start_month) || 4,
        invoiceFinancialYearStartDay: Number(ord.invoice_financial_year_start_day) || 1,
      };
      setOrderNumberForm(loadedOrder);
      setSavedOrderNumberForm(loadedOrder);
    } catch {
      // Keep safe defaults
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBusiness();
  }, [loadBusiness]);

  // ── Database Tools State ──────────────────────────────────────────────────
  const [masterPinStatus, setMasterPinStatus] = useState<MasterPinStatus>({ available: false, isSet: false, schemaVersion: null });
  const [pinGate, setPinGate] = useState<PinGate>(() => searchParams?.get('action') === 'master-pin' ? { mode: 'set' } : null);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [backupsLoading, setBackupsLoading] = useState(true);
  const [healthCheckOpen, setHealthCheckOpen] = useState(() => searchParams?.get('action') === 'health-check');
  const [healthReport, setHealthReport] = useState<HealthCheckReport | null>(null);
  const [applyingFixes, setApplyingFixes] = useState(false);
  const [initializeDbOpen, setInitializeDbOpen] = useState(() => searchParams?.get('action') === 'initialize-db');

  // Stub Google Drive objects for DatabaseSettingsTab contract
  const [googleDriveStatus, setGoogleDriveStatus] = useState<GoogleDriveStatus>({
    configured: false,
    auth_state: 'disconnected',
    connected: false,
    account_email: null,
    frequency: 'daily',
    retention_count: 7,
    destination_folder_id: null,
    destination_folder_name: null,
    last_backup_at: null,
    last_backup_status: null,
    last_error: null,
    last_attempt_at: null,
    last_success_at: null,
    last_success_kind: null,
    next_retry_at: null,
    retention_status: null,
    revoke_status: null,
    warning_acknowledged: false,
    warning_required: false,
    job: null,
    secure_storage_available: false,
  });
  const [googleDriveDestinations] = useState<GoogleDriveDestination[]>([]);
  const [googleDriveDestinationsLoading] = useState(false);
  const [remoteBackups] = useState<GoogleDriveRemoteBackup[]>([]);
  const [remoteBackupsLoading] = useState(false);

  const fetchMasterPinStatus = async (signal?: AbortSignal): Promise<boolean> => {
    try {
      const { data } = await api.get('/db-tools/master-pin/status', signal ? { signal } : undefined);
      if (signal?.aborted) return false;
      setMasterPinStatus(data);
      return true;
    } catch {
      return false;
    }
  };

  const fetchBackups = async (signal?: AbortSignal): Promise<boolean> => {
    setBackupsLoading(true);
    try {
      const { data } = await api.get('/db-tools/backups', signal ? { signal } : undefined);
      if (signal?.aborted) return false;
      setBackups(data.backups ?? []);
      return true;
    } catch {
      return false;
    } finally {
      if (!signal?.aborted) setBackupsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'data') {
      const controller = new AbortController();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchMasterPinStatus(controller.signal);
      fetchBackups(controller.signal);
      return () => controller.abort();
    }
  }, [activeTab]);

  const runHealthCheck = async () => {
    setHealthCheckOpen(true);
    try {
      const { data } = await api.get('/db-tools/health-check');
      setHealthReport(data);
    } catch {
      toast.error(t('healthCheckFailed'));
      setHealthCheckOpen(false);
    }
  };

  const applySafeFixes = async () => {
    setApplyingFixes(true);
    try {
      const { data } = await api.post('/db-tools/apply-safe-fixes', {});
      if (data.errors?.length) {
        toast.error(t('fixesAppliedPartial', { applied: data.applied.length, failed: data.errors.length }));
      } else {
        toast.success(t('fixesApplied', { count: data.applied.length }));
      }
      await runHealthCheck();
    } catch {
      toast.error(t('applyingFixesFailed'));
    } finally {
      setApplyingFixes(false);
    }
  };

  const runImport = async (data: ImportPayload, overwrite: boolean, master_pin?: string) => {
    try {
      const response = await api.post('/db/import', { data, overwrite, master_pin });
      if (response.data.success) toast.success(t('importSuccess'));
      return { success: true };
    } catch {
      const message = t('importFailed');
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const handleCreateBackup = async () => {
    if (masterPinStatus.available && masterPinStatus.isSet) {
      setPinGate({ mode: 'backup' });
      return;
    }
    try {
      const response = await api.post('/db/backup', {});
      toast.success(`${t('backupCreated')} ${response.data.path || ''}`, { duration: 5000 });
      fetchBackups();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || t('backupFailed'));
    }
  };

  const handleChooseBackupLocation = async () => {
    if (typeof window !== 'undefined' && window.electronAPI?.backupDatabase) {
      if (masterPinStatus.available && masterPinStatus.isSet) {
        setPinGate({ mode: 'backup-custom' });
        return;
      }
      const result = await window.electronAPI.backupDatabase('');
      if (result.success) {
        toast.success(`${t('backupCreated')} ${result.path}`, { duration: 5000 });
        fetchBackups();
      } else if (result.error !== 'Cancelled') {
        toast.error(result.error || t('backupFailedGeneric'));
      }
      return;
    }

    // In web browser mode: download SQLite database backup directly
    try {
      const response = await api.get('/db/download', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/x-sqlite3' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `restrodash-backup-${new Date().toISOString().split('T')[0]}.db`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(t('backupCreated'));
    } catch {
      toast.error(t('backupFailed'));
    }
  };

  const handleRestoreFromHistory = async (backup: BackupInfo) => {
    const ok = await confirm(t('restoreConfirm', { fileName: backup.fileName }), {
      title: t('confirmRestoreTitle'),
      confirmLabel: t('restoreBackup'),
      destructive: true,
    });
    if (!ok) return;

    if (masterPinStatus.available && masterPinStatus.isSet) {
      setPinGate({ mode: 'restore', payload: { backupPath: backup.path, fileName: backup.fileName } });
      return;
    }

    if (typeof window !== 'undefined' && window.electronAPI?.restoreBackup) {
      const result = await window.electronAPI.restoreBackup('', backup.path);
      if (result.success) {
        toast.success(tRestore('success'));
        setTimeout(() => window.location.reload(), 1500);
      } else if (result.error !== 'Cancelled') {
        toast.error(result.error || t('restoreFailedGeneric'));
      }
      return;
    }

    // Web browser mode: restore backup using server API
    try {
      await api.post(`/db-tools/backups/${encodeURIComponent(backup.fileName)}/restore`, {});
      toast.success(tRestore('success'));
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || t('restoreFailedGeneric'));
    }
  };

  const handleRestoreFromFile = useCallback(async () => {
    if (!window.electronAPI?.pickRestoreFile) {
      toast.error(tCommon('notAvailable'));
      return;
    }
    const picked = await window.electronAPI.pickRestoreFile();
    if (picked.canceled || !picked.path || !picked.token) return;

    const fileName = picked.path.split(/[\\/]/).pop() || picked.path;
    const ok = await confirm(
      `${t('restoreConfirm', { fileName })}\n\n${t('restoreReplacesDetail')}\n\n${t('restoreKeepsDetail')}\n\n${t('restoreSafetyCopyDetail')}`,
      { title: t('confirmRestoreTitle'), confirmLabel: t('restoreBackup'), destructive: true },
    );
    if (!ok) return;

    try {
      const { data } = await api.post('/db/restore', {
        confirmation: RESTORE_CONFIRMATION,
        selection_token: picked.token,
      });
      toast.success(tRestore('success'));
      setTimeout(() => window.location.reload(), 1500);
      return data;
    } catch (error) {
      const detail = axios.isAxiosError(error)
        ? (error.response?.data as { error?: string } | undefined)?.error
        : undefined;
      toast.error(detail || t('restoreFailedGeneric'));
    }
  }, [confirm, t, tCommon, tRestore]);

  const handleDeleteBackup = async (backup: BackupInfo) => {
    const ok = await confirm(t('deleteBackupConfirm', { fileName: backup.fileName }), {
      title: t('confirmDeleteBackupTitle'),
      confirmLabel: t('deleteBackup'),
      destructive: true,
    });
    if (!ok) return;

    if (masterPinStatus.available && masterPinStatus.isSet) {
      setPinGate({ mode: 'delete-backup', payload: { fileName: backup.fileName } });
      return;
    }

    try {
      await api.post(`/db-tools/backups/${encodeURIComponent(backup.fileName)}/delete`, {});
      toast.success(t('backupDeleted'));
      fetchBackups();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || t('backupDeleteFailed'));
    }
  };

  const handleInitializeDatabase = async (pin?: string) => {
    try {
      const response = await api.post('/db/initialize', { master_pin: pin });
      return { success: Boolean(response.data?.success), error: response.data?.error };
    } catch (error: unknown) {
      return { success: false, error: (error as { response?: { data?: { error?: string } } })?.response?.data?.error || t('initializeFailedGeneric') };
    }
  };

  const handlePinGateSubmit = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    if (!pinGate) return { success: false, error: t('nothingPending') };

    if (pinGate.mode === 'set') {
      try {
        await api.post('/db-tools/master-pin/reset', { pin, confirm_pin: pin });
        await fetchMasterPinStatus();
        toast.success(t('masterPinSaved'));
        setPinGate(null);
        return { success: true };
      } catch {
        return { success: false, error: t('savePinFailed') };
      }
    }

    if (pinGate.mode === 'backup') {
      try {
        const response = await api.post('/db/backup', { master_pin: pin });
        toast.success(`${t('backupCreated')} ${response.data.path}`, { duration: 5000 });
        setPinGate(null);
        fetchBackups();
        return { success: true };
      } catch {
        return { success: false, error: t('backupFailedGeneric') };
      }
    }

    if (pinGate.mode === 'backup-custom') {
      if (typeof window !== 'undefined' && window.electronAPI?.backupDatabase) {
        const result = await window.electronAPI.backupDatabase(pin);
        if (result.success) {
          toast.success(`${t('backupCreated')} ${result.path}`, { duration: 5000 });
          setPinGate(null);
          return { success: true };
        }
        if (result.error === 'Cancelled') {
          setPinGate(null);
          return { success: true };
        }
        return { success: false, error: result.error || t('backupFailedGeneric') };
      }
      try {
        const response = await api.get(`/db/download?master_pin=${encodeURIComponent(pin)}`, { responseType: 'blob' });
        const blob = new Blob([response.data], { type: 'application/x-sqlite3' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `restrodash-backup-${new Date().toISOString().split('T')[0]}.db`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success(t('backupCreated'));
        setPinGate(null);
        return { success: true };
      } catch (err: unknown) {
        return { success: false, error: (err as { response?: { data?: { error?: string } } })?.response?.data?.error || t('backupFailedGeneric') };
      }
    }

    if (pinGate.mode === 'restore') {
      if (typeof window !== 'undefined' && window.electronAPI?.restoreBackup) {
        const result = await window.electronAPI.restoreBackup(pin, pinGate.payload.backupPath);
        if (result.success) {
          toast.success(tRestore('success'));
          setPinGate(null);
          setTimeout(() => window.location.reload(), 1500);
          return { success: true };
        }
        if (result.error === 'Cancelled') {
          setPinGate(null);
          return { success: true };
        }
        return { success: false, error: result.error || t('restoreFailedGeneric') };
      }

      if (pinGate.payload.fileName) {
        try {
          await api.post(`/db-tools/backups/${encodeURIComponent(pinGate.payload.fileName)}/restore`, { master_pin: pin });
          toast.success(tRestore('success'));
          setPinGate(null);
          setTimeout(() => window.location.reload(), 1500);
          return { success: true };
        } catch (err: unknown) {
          return { success: false, error: (err as { response?: { data?: { error?: string } } })?.response?.data?.error || t('restoreFailedGeneric') };
        }
      }

      return { success: false, error: tCommon('notAvailable') };
    }

    if (pinGate.mode === 'delete-backup') {
      try {
        await api.post(`/db-tools/backups/${encodeURIComponent(pinGate.payload.fileName)}/delete`, { master_pin: pin });
        toast.success(t('backupDeleted'));
        setPinGate(null);
        fetchBackups();
        return { success: true };
      } catch {
        return { success: false, error: t('backupDeleteFailed') };
      }
    }

    if (pinGate.mode === 'import') {
      const result = await runImport(pinGate.payload.data, pinGate.payload.overwrite, pin);
      if (result.success) setPinGate(null);
      return result;
    }

    return { success: false, error: t('nothingPending') };
  };

  // ── Save Store Details & Order Numbering ──────────────────────────────────
  const saveBusinessInfo = async (silent = false) => {
    const norm = normalizeOptionalPhone(form.businessPhone, form.countryCode || '');
    if (!norm.valid) {
      toast.error(t('invalidPhoneFormat'));
      return;
    }
    const normalizedBusinessPhone = norm.e164 ?? '';

    setSavingBusiness(true);
    try {
      await api.put('/settings/business', {
        business_name: form.businessName,
        timezone: form.timezone,
        business_day_start_time: form.businessDayStartTime,
        currency: form.currency,
        country: form.countryCode,
        billing_type: form.billingType,
        tables_required: true,
        tax_registered: form.taxRegistered,
        tax_registration_number: form.taxRegistrationNumber,
        business_address: form.businessAddress,
        business_phone: normalizedBusinessPhone,
        instagram_handle: form.instagramHandle,
        currency_display: form.currencyDisplay,
        number_digits: form.numberDigits,
        calendar: form.calendar,
      });
      const updatedForm = { ...form, businessPhone: normalizedBusinessPhone, tablesRequired: true };
      setSavedBusiness(updatedForm);
      setForm(updatedForm);
      updateCurrentTenant({
        currency: form.currency,
        timezone: form.timezone,
        business_day_start_time: form.businessDayStartTime,
        country: form.countryCode,
        currency_display: form.currencyDisplay,
        number_digits: form.numberDigits,
        calendar: form.calendar,
      });
      if (!silent) toast.success(t('storeSaved'));
    } catch (err: unknown) {
      if (!silent) toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || t('saveFailed'));
      throw err;
    } finally {
      setSavingBusiness(false);
    }
  };

  const saveOrderNumbering = async (silent = false) => {
    setSavingOrderNumbering(true);
    try {
      await api.put('/settings/order-numbering', {
        order_number_prefix: orderNumberForm.prefix.trim(),
        order_number_include_date: orderNumberForm.includeDate,
        order_number_reset_daily: orderNumberForm.resetDaily,
        invoice_number_prefix: orderNumberForm.invoicePrefix.trim(),
        invoice_number_include_period: orderNumberForm.invoiceIncludePeriod,
        invoice_number_reset_period: orderNumberForm.invoiceResetPeriod,
        invoice_financial_year_start_month: orderNumberForm.invoiceFinancialYearStartMonth,
        invoice_financial_year_start_day: orderNumberForm.invoiceFinancialYearStartDay,
      });
      const saved = { ...orderNumberForm };
      setOrderNumberForm(saved);
      setSavedOrderNumberForm(saved);
      if (!silent) toast.success(t('orderNumberingSaved'));
    } catch {
      if (!silent) toast.error(t('saveFailed'));
    } finally {
      setSavingOrderNumbering(false);
    }
  };

  const isDirty =
    JSON.stringify(form) !== JSON.stringify(savedBusiness) ||
    JSON.stringify(orderNumberForm) !== JSON.stringify(savedOrderNumberForm);

  const saveAll = async () => {
    try {
      await Promise.all([saveBusinessInfo(true), saveOrderNumbering(true)]);
      toast.success(t('allSaved'));
    } catch {
      toast.error(t('allSaveFailed'));
    }
  };

  const discardAll = () => {
    setForm(savedBusiness);
    setOrderNumberForm(savedOrderNumberForm);
  };

  return (
    <div className="md:h-full md:min-h-0">
      <Tabs orientation="vertical" value={activeTab} onValueChange={handleSettingsTabChange} className="flex flex-col md:flex-row gap-6 items-start md:h-full md:min-h-0">
        {/* Settings sidebar nav */}
        <div className="w-full md:w-44 md:min-w-[11rem] shrink-0 md:h-full md:min-h-0 md:flex md:flex-col">
          <div className="flex items-center gap-3 mb-6 shrink-0">
            <Settings size={28} className="text-brand" />
            <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          </div>

          <nav className="flex md:flex-col gap-0.5 overflow-x-auto md:flex-1 md:min-h-0 md:overflow-x-hidden md:overflow-y-auto md:overscroll-contain border-b md:border-b-0 md:border-e border-border pb-2 md:pb-0 md:pe-2">
            <div className="hidden md:block px-3 pt-3 pb-2 mt-2 mb-1 border-b border-border">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('navGroupGeneral')}</p>
            </div>
            <SettingsNavItem label={t('storeDetails')} value="store" active={activeTab} onClick={handleSettingsTabChange} />
            {canViewTaxConfiguration && (
              <SettingsNavItem label={t('taxConfiguration')} value="tax" active={activeTab} onClick={handleSettingsTabChange} />
            )}
            {canManageDatabase && (
              <SettingsNavItem label={t('tabBackupData')} value="data" active={activeTab} onClick={handleSettingsTabChange} />
            )}

            {/* Commented out for now per user instruction */}
            {/* <SettingsNavItem label={t('tabPrinters')} value="receipts-printers" active={activeTab} onClick={handleSettingsTabChange} /> */}
            {/* <SettingsNavItem label={t('paymentMethods')} value="payments" active={activeTab} onClick={handleSettingsTabChange} /> */}
          </nav>
        </div>

        <div className={`flex-1 min-w-0 md:h-full md:min-h-0 md:overflow-y-auto md:overscroll-contain pb-8 md:pb-12 ${isDirty ? 'pb-32 md:pb-32' : ''}`}>
          {!isAdmin && (
            <p data-testid="settings-read-only-notice" className="mb-5 flex items-start gap-2 rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
              <Lock size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
              <span>{t('viewOnlyNotice')}</span>
            </p>
          )}

          {/* 1. Store Details */}
          <TabsContent value="store">
            <GeneralSettingsTab
              isAdmin={isAdmin}
              isOwner={canManageDatabase}
              form={form}
              setForm={setForm}
              taxIdFormat={taxIdFormat}
              taxIdFormatCountryCode={taxIdFormatCountryCode}
              orderNumberForm={orderNumberForm}
              setOrderNumberForm={setOrderNumberForm}
              markHydrationTouched={markHydrationTouched}
              onRequestCurrencyChange={setCurrencyResetTarget}
            />
          </TabsContent>

          {/* 2. Tax Configuration */}
          {canViewTaxConfiguration && (
            <TabsContent value="tax">
              <TaxConfigurationPanel isOwner={canManageTaxPacks} />
            </TabsContent>
          )}

          {/* 4. Data & Backups */}
          <TabsContent value="data">
            <DatabaseSettingsTab
              isOwner={canManageDatabase}
              masterPinStatus={masterPinStatus}
              backups={backups}
              backupsLoading={backupsLoading}
              googleDriveStatus={googleDriveStatus}
              googleDriveDestinations={googleDriveDestinations}
              googleDriveDestinationsLoading={googleDriveDestinationsLoading}
              remoteBackups={remoteBackups}
              remoteBackupsLoading={remoteBackupsLoading}
              setGoogleDriveStatus={setGoogleDriveStatus}
              connectingGoogleDrive={false}
              disconnectingGoogleDrive={false}
              savingGoogleDrivePrefs={false}
              managingGoogleDriveDestination={false}
              backingUpGoogleDrive={false}
              onFetchBackups={fetchBackups}
              onCreateBackup={handleCreateBackup}
              onChooseBackupLocation={handleChooseBackupLocation}
              onRestoreFromHistory={handleRestoreFromHistory}
              onRestoreFromFile={handleRestoreFromFile}
              onDeleteBackup={handleDeleteBackup}
              onConnectGoogleDrive={async () => {}}
              onDisconnectGoogleDrive={async () => {}}
              onCreateGoogleDriveDestination={async () => {}}
              onSelectGoogleDriveDestination={async () => {}}
              onUpdateGoogleDrivePrefs={async () => {}}
              onBackupToGoogleDriveNow={async () => {}}
              onFetchRemoteBackups={async () => {}}
              onRestoreRemoteBackup={async () => {}}
              onRunImport={runImport}
              onRequestPinGate={setPinGate}
              onRunHealthCheck={runHealthCheck}
              onRequestInitializeDb={() => setInitializeDbOpen(true)}
              confirm={confirm}
            />
          </TabsContent>

          {/* Commented out for now per user instruction */}
          {/* 
          <TabsContent value="payments">
            <PaymentMethodsSettings isAdmin={isAdmin} />
          </TabsContent>
          <TabsContent value="receipts-printers">
            <PrintersSettingsTab ... />
          </TabsContent> 
          */}
        </div>
      </Tabs>

      {ConfirmDialog}

      <MasterPinPrompt
        open={pinGate !== null}
        mode={pinGate?.mode === 'set' ? 'set' : 'verify'}
        title={
          pinGate?.mode === 'backup' || pinGate?.mode === 'backup-custom' ? t('confirmBackupTitle')
          : pinGate?.mode === 'import' ? t('confirmImportTitle')
          : pinGate?.mode === 'restore' ? t('confirmRestoreTitle')
          : undefined
        }
        onCancel={() => setPinGate(null)}
        onSubmit={handlePinGateSubmit}
      />

      <HealthCheckDialog
        open={healthCheckOpen}
        onOpenChange={setHealthCheckOpen}
        report={healthReport}
        applying={applyingFixes}
        onApplySafeFixes={applySafeFixes}
      />

      <InitializeDatabaseDialog
        open={initializeDbOpen}
        onOpenChange={setInitializeDbOpen}
        onConfirm={handleInitializeDatabase}
        onSuccess={() => {
          toast.success(t('dbInitializedRedirecting'));
          setTimeout(() => window.location.replace('/setup'), 1200);
        }}
      />

      <CurrencyResetDialog
        open={Boolean(currencyResetTarget)}
        targetCurrency={currencyResetTarget}
        onOpenChange={(open) => { if (!open) setCurrencyResetTarget(''); }}
        onSuccess={() => {
          toast.success(t('currencyResetComplete'));
          window.location.replace('/setup');
        }}
      />

      {isAdmin && isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-gray-900 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-6 pointer-events-auto">
            <span className="text-sm font-medium">{t('unsavedChanges')}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={discardAll}
                disabled={savingBusiness || savingOrderNumbering}
                className="px-4 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50 text-white"
              >
                {t('discard')}
              </button>
              <button
                onClick={saveAll}
                disabled={savingBusiness || savingOrderNumbering}
                className="px-4 py-1.5 text-sm bg-brand hover:opacity-90 rounded-full font-medium transition-colors disabled:opacity-50 text-white"
              >
                {(savingBusiness || savingOrderNumbering) ? t('saving') : t('saveChanges')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
