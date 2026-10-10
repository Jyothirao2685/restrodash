'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { Plus, X, Search, UserPlus, RotateCcw, Pencil, MapPin, MapPinned, List, QrCode, UserX } from 'lucide-react';
import type { Table, Customer, Order, OrderItem, Bill } from '@/lib/types';
import FloorplanEditor from '@/components/tables/FloorplanEditor';
import TableQrModal from '@/components/tables/TableQrModal';
import BatchQrPrintModal from '@/components/tables/BatchQrPrintModal';
import PaymentModal from '@/components/pos/PaymentModal';
import { usePrinterStore } from '@/hooks/usePrinter';
import { usePosSettingsStore } from '@/store/pos-settings';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { preferChildScopedBill } from '@/lib/printer/tax-components';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { tenantCan } from '@/lib/permissions';
import { countryName, getCurrencySymbol, getCountryByCode } from '@/lib/countries';
import { parsePhone, dialCodeFor } from '@/lib/phone';
import { useTranslations, type AppConfig } from 'use-intl';
import { Ltr } from '@/components/layout/Ltr';
import { ITEM_STATUS_LABEL_KEYS, TABLE_STATUS_LABEL_KEYS } from '@/lib/i18n-enums';
import { TableTurnoverBadge } from '@/components/tables/TableTurnoverBadge';

const statusColors: Record<string, string> = {
  available: 'bg-green-500',
  occupied: 'bg-red-500',
  reserved: 'bg-yellow-500',
  cleaning: 'bg-gray-500',
  held: 'bg-blue-500',
};

type OrdersKey = keyof AppConfig['Messages']['orders'];

const itemStatusLabelKey = (status: OrderItem['status']): OrdersKey =>
  ITEM_STATUS_LABEL_KEYS[status] ?? 'itemStatusPending';

interface ReserveModalProps {
  table: Table;
  onClose: () => void;
  onDone: () => void;
}

function ReserveModal({ table, onClose, onDone }: ReserveModalProps) {
  const { currentTenant } = useAuthStore();
  const tTables = useTranslations('tables');
  const tPos = useTranslations('pos');
  const tNav = useTranslations('nav');
  const tSettings = useTranslations('settings');
  const tProducts = useTranslations('products');
  const dialCode = dialCodeFor(currentTenant?.country ?? '');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const searchRequestRef = useRef(0);


  const searchCustomers = (q: string) => {
    const requestId = ++searchRequestRef.current;
    if (q.length < 2) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/customers-search?q=${encodeURIComponent(q)}`);
        if (requestId === searchRequestRef.current) setResults(Array.isArray(data) ? data : []);
      } catch {
        if (requestId === searchRequestRef.current) setResults([]);
      }
    }, 300);
  };

  const handleCreateCustomer = async () => {
    if (!newName.trim() || !newPhone.trim()) return;
    const country = currentTenant?.country ?? '';
    const parsed = parsePhone(newPhone, country);
    if (!parsed) {
      toast.error(tPos('invalidPhone', { country: countryName(country) }));
      return;
    }
    setCreating(true);
    try {
      const { data } = await api.post('/customers', { name: newName, phone: parsed.e164, country_code: parsed.countryCode });
      setSelected(data.customer);
      setShowCreate(false);
      setQuery('');
      setResults([]);
      toast.success(tPos('customerCreated'));
    } catch {
      toast.error(tPos('createCustomerFailed'));
    } finally {
      setCreating(false);
    }
  };

  const handleReserve = async () => {
    setSaving(true);
    try {
      await api.patch(`/tables/${table.id}/status`, {
        status: 'reserved',
        reservation_customer_id: selected?.id ?? null,
      });
      const msg = selected
        ? tTables('reservedFor', { name: table.name, customer: selected.name })
        : tTables('reservedNoCustomer', { name: table.name });
      toast.success(msg);
      onDone();
    } catch {
      toast.error(tTables('tableReserveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl p-6 w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">{tNav('tables')} · {table.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-muted-foreground"><X size={20} /></button>
        </div>

        {selected ? (
          <div className="flex items-center justify-between px-3 py-2.5 bg-brand-light dark:bg-[var(--color-brand-light)] rounded-xl mb-4">
            <div>
              <p className="font-semibold text-brand dark:text-indigo-300 text-sm">{selected.name}</p>
              <p className="text-xs text-brand/70 dark:text-indigo-300"><Ltr>{selected.phone}</Ltr></p>
            </div>
            <button onClick={() => setSelected(null)} className="text-brand dark:text-indigo-300 hover:text-brand-hover dark:hover:text-indigo-200">
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">{tTables('linkCustomer')}</p>
            <div className="relative mb-2">
              <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); searchCustomers(e.target.value); }}
                placeholder={tTables('searchCustomerPlaceholder')}
                className="w-full ps-8 pe-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-brand outline-none"
              />
            </div>
            {results.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden mb-2 max-h-36 overflow-y-auto">
                {results.map((c) => (
                  <button key={c.id} onClick={() => { setSelected(c); setQuery(''); setResults([]); }}
                    className="w-full text-start px-3 py-2 hover:bg-muted text-sm border-b border-border last:border-0">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-gray-400 ms-2 text-xs"><Ltr>{c.phone}</Ltr></span>
                  </button>
                ))}
              </div>
            )}
            {!showCreate ? (
              <button onClick={() => { setShowCreate(true); if (/^\d+$/.test(query.trim())) setNewPhone(query.trim()); }}
                className="flex items-center gap-1.5 text-sm text-brand font-medium hover:text-brand-hover">
                <UserPlus size={14} /> {tTables('newCustomer')}
              </button>
            ) : (
              <div className="space-y-2 border border-border rounded-xl p-3">
                <input type="text" placeholder={tProducts('nameLabel')} value={newName} onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-border rounded-lg outline-none focus:ring-1 focus:ring-brand" />
                <div className="flex items-stretch gap-2">

                  <input type="tel" inputMode="numeric" placeholder={`${dialCode} ${tSettings('phone')}`} value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-sm border border-border rounded-lg outline-none focus:ring-1 focus:ring-brand" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowCreate(false)} className="flex-1 py-1.5 text-sm border border-border rounded-lg hover:bg-muted">{tTables('cancel')}</button>
                  <button onClick={handleCreateCustomer} disabled={creating || !newName.trim() || !newPhone.trim()}
                    className="flex-1 py-1.5 text-sm bg-brand text-white rounded-lg hover:opacity-90 disabled:opacity-50">
                    {creating ? tTables('creating') : tTables('create')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">{tTables('cancel')}</Button>
          <Button onClick={handleReserve} disabled={saving} className="flex-1">
            {saving ? tTables('reserving') : tTables('reserveTable')}
          </Button>
        </div>
      </div>
    </div>
  );
}


export default function TablesPage() {
  const tTables = useTranslations('tables');
  const router = useRouter();
  const tOrders = useTranslations('orders');
  const { currentTenant } = useAuthStore();
  const canManageTables = tenantCan(currentTenant, 'tables.manage');
  const canReadOrders = tenantCan(currentTenant, 'orders.read');
  const { printBill } = usePrinterStore();
  const { autoPrintBill } = usePosSettingsStore();
  const fmt = useFormatCurrency();
  const currency = getCurrencySymbol(currentTenant?.currency || '', getCountryByCode(currentTenant?.country ?? '')?.locale);

  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [reservingTable, setReservingTable] = useState<Table | null>(null);
  const [qrTable, setQrTable] = useState<Table | null>(null);
  const [showBatchQrModal, setShowBatchQrModal] = useState(false);
  const [paymentBill, setPaymentBill] = useState<Bill | null>(null);
  const [generatingBillId, setGeneratingBillId] = useState<number | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);
  // List is the default view (table management + Add table); the floor
  // plan editor is the second view for visual layout work.
  const [view, setView] = useState<'plan' | 'list'>('list');
  const [layoutMode, setLayoutMode] = useState(false);
  const [form, setForm] = useState({ name: '', capacity: '4', floor: 'Ground', section: '' });
  const [showDetails, setShowDetails] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('tables_showDetails');
      return stored !== null ? stored === 'true' : true;
    }
    return true;
  });

  const toggleDetails = () => {
    const next = !showDetails;
    setShowDetails(next);
    localStorage.setItem('tables_showDetails', String(next));
  };

  const fetchTables = async () => {
    try {
      const { data } = await api.get('/tables');
      setTables(data.tables || []);
    } catch {
      toast.error(tTables('loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = () => {
      api.get('/tables')
        .then(({ data }) => setTables(data.tables || []))
        .catch(() => toast.error(tTables('loadFailed')))
        .finally(() => setLoading(false));
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutMode]);

  const displaysOrderDetails = canReadOrders && showDetails;

  // Clear stale order list immediately when details panel is hidden.
  const [syncedShowDetails, setSyncedShowDetails] = useState(showDetails);
  if (showDetails !== syncedShowDetails) {
    setSyncedShowDetails(showDetails);
    if (!showDetails && view !== 'plan') setOrders([]);
  }

  const fetchOrders = useCallback(() => {
    if (!canReadOrders || (view !== 'plan' && !showDetails)) return;
    api.get('/orders', { params: { status: 'pending,preparing,ready,served', per_page: 500 } })
      .then(({ data }) => setOrders(data.orders || []))
      .catch(() => {
        // silently fail — tables still show
      });
  }, [canReadOrders, showDetails, view]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders, layoutMode]);

  const handleCheckout = async (orderId: number) => {
    setGeneratingBillId(orderId);
    try {
      const { data } = await api.post('/bills/generate', { order_id: orderId });
      setPaymentBill(data.bill);
    } catch {
      toast.error(tOrders('generateBillFailed'));
    } finally {
      setGeneratingBillId(null);
    }
  };

  const handlePaymentComplete = async (opts?: { printReceipt?: boolean }) => {
    const bill = paymentBill;
    setPaymentBill(null);
    fetchTables();
    fetchOrders();

    if (bill && (opts?.printReceipt || autoPrintBill)) {
      try {
        const fallbackOrder = orders.find((o) => o.bill?.id === bill.id);
        const { data } = await api.get(`/bills/${bill.id}`);
        const latestBill = preferChildScopedBill(data.bill as Bill, fallbackOrder);
        await printBill(
          latestBill,
          {
            business_name: currentTenant?.business_name || '',
            currency: currentTenant?.currency || '',
            country: currentTenant?.country || '',
            timezone: currentTenant?.timezone || 'UTC',
            currency_display: currentTenant?.currency_display,
            number_digits: currentTenant?.number_digits,
            calendar: currentTenant?.calendar,
          },
          { isReprint: false }
        );
      } catch {}
    }
  };

  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelOverridePin, setCancelOverridePin] = useState('');
  const [pinRequiredError, setPinRequiredError] = useState(false);

  const handleOpenCancelModal = (order: Order) => {
    setOrderToCancel(order);
    setCancelReason('');
    setCancelOverridePin('');
    setPinRequiredError(false);
  };

  const handleConfirmCancel = async () => {
    if (!orderToCancel || cancellingOrderId === orderToCancel.id) return;
    setCancellingOrderId(orderToCancel.id);
    try {
      if (orderToCancel.approval_status === 'pending_approval') {
        await api.post(`/orders/${orderToCancel.id}/qr-reject`, {
          reason: cancelReason.trim() || 'Cancelled from tables page',
        });
      } else {
        await api.patch(`/orders/${orderToCancel.id}/status`, {
          status: 'cancelled',
          reason: cancelReason.trim() || 'Cancelled from tables page',
          free_table: true,
          override_pin: cancelOverridePin.trim() || undefined,
        });
      }
      toast.success('Order cancelled');
      setOrderToCancel(null);
      fetchOrders();
      fetchTables();
    } catch (err: unknown) {
      const errorObj = (err as { response?: { data?: { error?: string } } })?.response?.data;
      if (errorObj?.error?.includes('PIN required')) {
        setPinRequiredError(true);
        toast.error('Manager PIN required to cancel this order');
        return;
      }
      const msg = errorObj?.error || 'Failed to cancel order';
      toast.error(msg);
    } finally {
      setCancellingOrderId(null);
    }
  };

  // Group active orders by table_id — always built so both the floorplan
  // editor and the list view can read active orders per table.
  const ordersByTable = new Map<string, Order[]>();
  for (const order of canReadOrders ? orders : []) {
    if (!order.table_id) continue;
    const tableKey = String(order.table_id);
    const existing = ordersByTable.get(tableKey);
    if (existing) existing.push(order);
    else ordersByTable.set(tableKey, [order]);
  }

  const closeTableForm = () => {
    setShowForm(false);
    setEditingTable(null);
    setForm({ name: '', capacity: '4', floor: 'Ground', section: '' });
  };

  const openCreate = (floor = 'Ground') => {
    setEditingTable(null);
    setForm({ name: '', capacity: '4', floor, section: '' });
    setShowForm(true);
  };

  const openEdit = (table: Table) => {
    setEditingTable(table);
    setForm({
      name: table.name,
      capacity: String(table.capacity),
      floor: table.floor || '',
      section: table.section || '',
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const capacity = Number(form.capacity);
    if (!name) {
      toast.error(tTables('tableNameRequired'));
      return;
    }
    if (!Number.isInteger(capacity) || capacity < 1) {
      toast.error(tTables('tableCapacityInvalid'));
      return;
    }

    try {
      const payload = {
        name,
        capacity,
        floor: form.floor.trim() || null,
        section: form.section.trim() || null,
      };
      if (editingTable) {
        const { data } = await api.put(`/tables/${editingTable.id}`, payload);
        setTables((current) => current.map((table) => table.id === editingTable.id ? data.table : table));
        toast.success(tTables('tableUpdated'));
      } else {
        const { data } = await api.post('/tables', payload);
        setTables((current) => [...current, { ...data.table, name: data.table.name || data.table.number }]);
        toast.success(tTables('tableCreated'));
      }
      closeTableForm();
    } catch (error: unknown) {
      const code = (error as { response?: { data?: { code?: string } } })?.response?.data?.code;
      const knownMessages: Record<string, string> = {
        TABLE_NAME_REQUIRED: tTables('tableNameRequired'),
        TABLE_CAPACITY_INVALID: tTables('tableCapacityInvalid'),
        TABLE_LOCATION_INVALID: tTables('tableLocationInvalid'),
        TABLE_NAME_DUPLICATE: tTables('tableNameDuplicate'),
        TABLE_INACTIVE_DUPLICATE: tTables('tableInactiveDuplicate'),
      };
      toast.error((code && knownMessages[code]) || (editingTable ? tTables('tableUpdateFailed') : tTables('tableCreateFailed')));
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/tables/${id}/status`, { status });
      fetchTables();
    } catch {
      toast.error(tTables('tableUpdateFailed'));
    }
  };

  const toggleActive = async (table: Table) => {
    try {
      await api.post(`/tables/${table.id}/${table.is_active ? 'deactivate' : 'reactivate'}`);
      fetchTables();
    } catch {
      toast.error(tTables('updateStatusFailed'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const floorValues = [...new Set(
    tables.filter((table) => table.is_active && table.floor?.trim()).map((table) => table.floor!.trim()),
  )].sort((a, b) => a.localeCompare(b));
  const activeFloor = selectedFloor === 'all' || floorValues.includes(selectedFloor) ? selectedFloor : 'all';
  const visibleTables = activeFloor === 'all' ? tables : tables.filter((table) => table.floor?.trim() === activeFloor);

  const locationBadge = (table: Table) => {
    if (!table.floor && !table.section) return null;
    return (
      <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground truncate max-w-[130px]" title={[table.floor, table.section].filter(Boolean).join(' · ')}>
        <MapPin size={11} className="shrink-0" /> {[table.floor, table.section].filter(Boolean).join(' · ')}
      </span>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">{tTables('title')}</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-xl bg-muted p-1">
            <button
              onClick={() => { setView('list'); setLayoutMode(false); }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                view === 'list' ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List size={14} /> {tTables('floorplanViewList')}
            </button>
            <button
              onClick={() => { setView('plan'); setLayoutMode(false); }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                view === 'plan' ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <MapPinned size={14} /> {tTables('floorplanViewPlan')}
            </button>
          </div>
          {view === 'plan' && !layoutMode && canManageTables && (
            <Button variant="outline" onClick={() => setLayoutMode(true)} aria-pressed={layoutMode}>
              {tTables('editLayout')}
            </Button>
          )}
          {layoutMode && (
            <Button variant="outline" onClick={() => setLayoutMode(false)}>
              {tTables('backToPlan')}
            </Button>
          )}
          {view === 'list' && canReadOrders && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showDetails}
                onChange={toggleDetails}
                className="w-4 h-4 rounded border-gray-300 dark:border-border text-brand focus:ring-brand"
              />
              {tTables('showOrderDetails')}
            </label>
          )}
          {canManageTables && (
            <Button
              variant="outline"
              onClick={() => setShowBatchQrModal(true)}
              className="flex items-center gap-1.5"
            >
              <QrCode size={14} />
              <span>Print All QR Cards</span>
            </Button>
          )}
          {view === 'list' && canManageTables && (
            <Button onClick={() => openCreate(activeFloor === 'all' ? 'Ground' : activeFloor)}>
              <Plus size={16} className="me-1" /> {tTables('addTable')}
            </Button>
          )}
        </div>
      </div>

      {/* Plan view: floorplan editor stays mounted so unsaved drag edits
          survive view switches between Plan and List. */}
      <div className={view === 'plan' ? '' : 'hidden'}>
        <FloorplanEditor
          mode={layoutMode && canManageTables ? 'edit' : 'service'}
          canManage={canManageTables}
          tables={tables}
          ordersByTable={ordersByTable}
          onSaved={fetchTables}
          onReserve={(tb) => setReservingTable(tb)}
          onViewOrder={canReadOrders ? () => router.push('/orders') : undefined}
        />
      </div>

      {view === 'list' && floorValues.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2" aria-label={tTables('floorFilter')}>
          {['all', ...floorValues].map((floor) => (
            <button
              key={floor}
              type="button"
              onClick={() => setSelectedFloor(floor)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                activeFloor === floor
                  ? 'border-brand bg-brand text-white'
                  : 'border-border bg-card text-muted-foreground hover:border-brand hover:text-brand'
              }`}
            >
              {floor === 'all' ? tTables('allFloors') : floor}
            </button>
          ))}
        </div>
      )}

      {view === 'list' ? (displaysOrderDetails ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleTables.map((table) => {
            const tableOrders = ordersByTable.get(table.id) || [];
            const hasOrders = tableOrders.length > 0;
            const isTableActive = hasOrders || table.status === 'occupied' || !!table.active_session_key;
            const primaryOrder = tableOrders[0];

            return (
              <div key={table.id}
                className={`bg-card rounded-xl border border-border flex flex-col justify-between hover:shadow-md transition-shadow ${
                  hasOrders ? 'border-s-4 border-s-brand' : ''
                } ${!table.is_active ? 'opacity-60' : ''}`}>
                <div>
                  {/* Table header */}
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusColors[table.status]}`} />
                      <h3 className="font-bold text-foreground text-base whitespace-nowrap">{table.name}</h3>
                      <span className="text-xs text-muted-foreground shrink-0">· {tTables('capacitySeats', { count: table.capacity })}</span>
                      {locationBadge(table)}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {table.status === 'occupied' && table.seated_at && (
                        <TableTurnoverBadge seatedAt={table.seated_at} />
                      )}
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        {tTables(TABLE_STATUS_LABEL_KEYS[table.status])}
                      </span>
                    </div>
                  </div>

                  {table.status === 'reserved' && table.reservation_customer_name && (
                    <div className="px-4 pt-2 pb-1">
                      <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium truncate">{table.reservation_customer_name}</p>
                      {table.reservation_customer_phone && (
                        <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-0.5"><Ltr>{table.reservation_customer_phone}</Ltr></p>
                      )}
                    </div>
                  )}

                  {/* Orders section */}
                  {hasOrders ? (
                    <div className="p-3 space-y-2.5">
                      {tableOrders.map((order) => (
                        <div key={order.id} className="bg-muted/40 rounded-lg p-3 border border-border/50">
                          {/* Order Header */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-xs font-bold text-foreground truncate">#<Ltr>{order.order_number}</Ltr></span>
                            <span className="text-xs font-semibold text-brand dark:text-brand-light">
                              {fmt(order.total)}
                            </span>
                          </div>

                          {order.customer?.name && (
                            <p className="text-[11px] text-muted-foreground mb-1.5">
                              {order.customer.name}
                              {order.customer.phone && <span className="ms-1.5 text-muted-foreground/70"><Ltr>{order.customer.phone}</Ltr></span>}
                            </p>
                          )}

                          {/* Flat high-density utilitarian items list */}
                          <div className="space-y-1 pt-1.5 border-t border-border/40">
                            {order.items?.filter(i => i.status !== 'cancelled').map((item) => (
                              <div key={item.id} className="flex items-center justify-between text-xs py-0.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="font-semibold text-foreground/75">×{item.quantity}</span>
                                  <span className="truncate text-foreground/90">{item.product_name}</span>
                                </div>
                                {item.status && item.status !== 'pending' && item.status !== 'served' && (
                                  <span className="text-[10px] text-muted-foreground uppercase tracking-tight">
                                    {tOrders(itemStatusLabelKey(item.status))}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-5 text-center text-xs text-muted-foreground">
                      {tTables('noActiveOrders')}
                    </div>
                  )}
                </div>

                {/* Utilitarian POS Actions Footer */}
                {canManageTables && (
                  <div className="px-3 py-2 border-t border-border flex items-center justify-between bg-muted/20">
                    {isTableActive ? (
                      <>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setQrTable(table)}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                            title="View & Print QR Code"
                          >
                            <QrCode size={13} className="me-1 text-orange-500" /> QR
                          </Button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {primaryOrder && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenCancelModal(primaryOrder)}
                                disabled={cancellingOrderId === primaryOrder.id}
                                className="h-7 px-2.5 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                                title="Cancel order"
                              >
                                {cancellingOrderId === primaryOrder.id ? '...' : 'Cancel'}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleCheckout(primaryOrder.id)}
                                disabled={generatingBillId === primaryOrder.id}
                                className="h-7 px-3 text-xs font-semibold bg-brand text-white hover:bg-brand/90 shadow-none"
                                title="Direct checkout & billing"
                              >
                                {generatingBillId === primaryOrder.id ? '...' : tOrders('checkout')}
                              </Button>
                            </>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              try {
                                await api.post(`/tables/${table.id}/release-qr-session`);
                                toast.success('Table released');
                                fetchTables();
                              } catch {
                                toast.error('Failed to release table');
                              }
                            }}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                            title="Release table session & mark available"
                          >
                            <UserX size={14} />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5">
                          {table.status === 'reserved' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus(table.id, 'available')}
                              className="h-7 px-2.5 text-xs"
                            >
                              {tTables('markAvailable')}
                            </Button>
                          ) : table.status === 'available' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setReservingTable(table)}
                              className="h-7 px-2.5 text-xs text-yellow-600 dark:text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/10"
                            >
                              {tTables('reserve')}
                            </Button>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setQrTable(table)}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                            title="View & Print QR Code"
                          >
                            <QrCode size={13} className="me-1 text-orange-500" /> QR
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(table)}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                            title={tTables('editTable')}
                          >
                            <Pencil size={12} />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleActive(table)}
                            className={`h-7 px-2 text-xs ${!table.is_active ? 'text-green-600 hover:text-green-700' : 'text-muted-foreground hover:text-destructive'}`}
                            title={!table.is_active ? tTables('reactivate') : tTables('deactivate')}
                          >
                            {!table.is_active ? <RotateCcw size={12} /> : <X size={13} />}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {visibleTables.map((table) => {
            const tableOrders = ordersByTable.get(table.id) || [];
            const hasOrders = tableOrders.length > 0;
            const isTableActive = hasOrders || table.status === 'occupied' || !!table.active_session_key;
            const primaryOrder = tableOrders[0];

            return (
              <div key={table.id}
                className={`bg-card rounded-xl p-4 border border-border flex flex-col justify-between hover:shadow-md transition-shadow ${
                  hasOrders ? 'border-s-4 border-s-brand' : ''
                } ${!table.is_active ? 'opacity-60' : ''}`}>
                <div>
                  <div className={`w-3 h-3 rounded-full ${statusColors[table.status]} mx-auto mb-2`} />
                  <h3 className="font-bold text-base text-foreground text-center whitespace-nowrap">{table.name}</h3>
                  <p className="text-xs text-muted-foreground text-center">{tTables('capacitySeats', { count: table.capacity })}</p>
                  <p className="text-[11px] text-muted-foreground uppercase font-medium tracking-wide text-center mt-1">
                    {tTables(TABLE_STATUS_LABEL_KEYS[table.status])}
                  </p>
                  {table.status === 'occupied' && table.seated_at && (
                    <div className="mt-1 flex justify-center"><TableTurnoverBadge seatedAt={table.seated_at} /></div>
                  )}
                  <div className="mt-1.5 flex justify-center">{locationBadge(table)}</div>
                  {table.status === 'reserved' && table.reservation_customer_name && (
                    <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium mt-1 truncate text-center">
                      {table.reservation_customer_name}
                    </p>
                  )}

                  {hasOrders && (
                    <div className="mt-3 pt-2 border-t border-border/50 text-center">
                      <span className="text-xs font-semibold text-foreground">
                        {tableOrders.length === 1 ? `#${tableOrders[0].order_number}` : `${tableOrders.length} orders`}
                      </span>
                    </div>
                  )}
                </div>

                {canManageTables && (
                  <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-center gap-1">
                    {isTableActive ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setQrTable(table)}
                          className="h-7 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                          title="QR Code"
                        >
                          <QrCode size={13} className="text-orange-500" />
                        </Button>

                        {primaryOrder && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenCancelModal(primaryOrder)}
                              disabled={cancellingOrderId === primaryOrder.id}
                              className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                              title="Cancel order"
                            >
                              {cancellingOrderId === primaryOrder.id ? '...' : 'Cancel'}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleCheckout(primaryOrder.id)}
                              disabled={generatingBillId === primaryOrder.id}
                              className="h-7 px-2 text-xs font-semibold bg-brand text-white hover:bg-brand/90"
                              title="Direct checkout"
                            >
                              {generatingBillId === primaryOrder.id ? '...' : tOrders('checkout')}
                            </Button>
                          </>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            try {
                              await api.post(`/tables/${table.id}/release-qr-session`);
                              toast.success('Table released');
                              fetchTables();
                            } catch {
                              toast.error('Failed to release table');
                            }
                          }}
                          className="h-7 px-1.5 text-xs text-muted-foreground hover:text-destructive"
                          title="Release table session & mark available"
                        >
                          <UserX size={14} />
                        </Button>
                      </>
                    ) : (
                      <>
                        {table.status === 'reserved' ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateStatus(table.id, 'available')}
                            className="h-7 px-1.5 text-xs"
                            title={tTables('markAvailable')}
                          >
                            <RotateCcw size={12} />
                          </Button>
                        ) : table.status === 'available' ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setReservingTable(table)}
                            className="h-7 px-1.5 text-xs text-yellow-600 dark:text-yellow-400"
                            title={tTables('reserve')}
                          >
                            <Plus size={12} />
                          </Button>
                        ) : null}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setQrTable(table)}
                          className="h-7 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                          title="QR Code"
                        >
                          <QrCode size={13} className="text-orange-500" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(table)}
                          className="h-7 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                          title={tTables('editTable')}
                        >
                          <Pencil size={12} />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleActive(table)}
                          className={`h-7 px-1.5 text-xs ${!table.is_active ? 'text-green-600' : 'text-muted-foreground hover:text-destructive'}`}
                          title={!table.is_active ? tTables('reactivate') : tTables('deactivate')}
                        >
                          {!table.is_active ? <RotateCcw size={12} /> : <X size={12} />}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )) : null}

      {view === 'list' && visibleTables.length === 0 && (
        <p className="text-center text-muted-foreground py-12">{tTables('noTablesYet')}</p>
      )}

      {/* Reserve Modal */}
      {reservingTable && (
        <ReserveModal
          table={reservingTable}
          onClose={() => setReservingTable(null)}
          onDone={() => { setReservingTable(null); fetchTables(); }}
        />
      )}

      {/* Table QR Code & Printable Tent Card Modal */}
      {qrTable && (
        <TableQrModal
          table={qrTable}
          isOpen={!!qrTable}
          onClose={() => setQrTable(null)}
        />
      )}

      {/* Batch QR Tent Cards Modal */}
      {showBatchQrModal && (
        <BatchQrPrintModal
          isOpen={showBatchQrModal}
          onClose={() => setShowBatchQrModal(false)}
        />
      )}

      {/* Add / Edit Table Modal (List view only — the floor plan editor
          has its own modal for click-to-edit on the canvas). */}
      {view === 'list' && showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">{editingTable ? tTables('editTable') : tTables('add')}</h2>
                {editingTable && <p className="text-xs text-muted-foreground mt-0.5">{tTables('editTableHelp')}</p>}
              </div>
              <button onClick={closeTableForm} className="text-gray-400 hover:text-muted-foreground"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{tTables('tableName')}</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={tTables('tableNamePlaceholder')} className="w-full px-3 py-2 border border-gray-300 dark:border-border rounded-lg outline-none focus:ring-2 focus:ring-brand" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">{tTables('capacity')}</label>
                  <input type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-border rounded-lg outline-none focus:ring-2 focus:ring-brand" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">{tTables('floor')}</label>
                  <input type="text" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-border rounded-lg outline-none focus:ring-2 focus:ring-brand" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{tTables('section')}</label>
                <input type="text" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-border rounded-lg outline-none focus:ring-2 focus:ring-brand" />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={closeTableForm} className="flex-1">{tTables('cancel')}</Button>
                <Button
                  type="submit"
                  disabled={!form.name.trim() || !Number.isInteger(Number(form.capacity)) || Number(form.capacity) < 1}
                  className="flex-1"
                >
                  {editingTable ? tTables('saveChanges') : tTables('createTable')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sleek In-App Cancel Order Modal */}
      {orderToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground text-base">Cancel Order</h3>
              <button
                type="button"
                onClick={() => setOrderToCancel(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              Are you sure you want to cancel order <span className="font-bold text-foreground">#<Ltr>{orderToCancel.order_number}</Ltr></span>?
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Customer changed mind, test order"
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-foreground/20"
                />
              </div>

              {pinRequiredError && (
                <div>
                  <label className="block text-xs font-semibold text-destructive uppercase tracking-wider mb-1">
                    Manager PIN Required
                  </label>
                  <input
                    type="password"
                    autoFocus
                    value={cancelOverridePin}
                    onChange={(e) => setCancelOverridePin(e.target.value)}
                    placeholder="Enter 4-digit Manager PIN"
                    className="w-full px-3 py-2 bg-muted/30 border border-destructive rounded-xl text-sm focus:outline-hidden focus:ring-1 focus:ring-destructive"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOrderToCancel(null)}
                className="h-9 px-3 text-xs"
              >
                Keep Order
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmCancel}
                disabled={cancellingOrderId === orderToCancel.id}
                className="h-9 px-3 text-xs font-semibold"
              >
                {cancellingOrderId === orderToCancel.id ? 'Cancelling...' : 'Yes, Cancel Order'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentBill && (
        <PaymentModal
          bill={paymentBill}
          currency={currency}
          onClose={() => setPaymentBill(null)}
          onPaid={handlePaymentComplete}
          onBillUpdate={(updated) => setPaymentBill(updated)}
        />
      )}
    </div>
  );
}
