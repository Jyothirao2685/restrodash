'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { usePosSettingsStore } from '@/store/pos-settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Check, KeyRound, Search, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { COUNTRIES, getCountryByCode, getLocalizedCountryName, countryMatchesQuery, sortCountriesByLocalizedName, type Country } from '@/lib/countries';
import { TimeZoneSelect } from '@/components/TimeZoneSelect';
import { CurrencySelect } from '@/components/CurrencySelect';
import { useLocale, useTranslations } from 'use-intl';
import { LANGUAGES, getBrowserLanguage, type Language } from '@/lib/i18n';

// Registry-derived selectable languages (derived from LANGUAGES registry where selectable: true).
const SELECTABLE_LANGUAGES: Language[] = (Object.keys(LANGUAGES) as Language[]).filter(
  (lang) => LANGUAGES[lang].selectable,
);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUSPECT_EMAIL_TLDS = new Set(['example', 'invalid', 'lcaol', 'local', 'localhost', 'test']);

function isValidOwnerEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

function hasSuspectEmailDomain(email: string): boolean {
  if (!isValidOwnerEmail(email)) return false;
  const domain = email.split('@').pop()?.toLowerCase() || '';
  const labels = domain.split('.');
  const tld = labels[labels.length - 1] || '';
  return SUSPECT_EMAIL_TLDS.has(tld);
}

export default function SetupPage() {
  const { logout } = useAuthStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showMasterPin, setShowMasterPin] = useState(false);
  const [showConfirmMasterPin, setShowConfirmMasterPin] = useState(false);
  const [showApprovalPin, setShowApprovalPin] = useState(false);
  const [showConfirmApprovalPin, setShowConfirmApprovalPin] = useState(false);
  // Wizard language follows shared store to update translations immediately.
  const language = usePosSettingsStore((s) => s.language);
  const setStoreLanguage = usePosSettingsStore((s) => s.setLanguage);
  const [browserLanguage, setBrowserLanguage] = useState<Language>('en');
  // No default country: regional settings come only from what the owner
  // selects here (docs/reference/product-invariants.md, "Regional settings come from
  // signup, never from a fallback").
  const [country, setCountry] = useState<string>('');
  const [currency, setCurrency] = useState<string>('');
  const [countryQuery, setCountryQuery] = useState<string>('');
  // The country profile timezone is only a suggested default, set once a
  // country is chosen below; the owner can override it for multi-timezone countries.
  const [timezone, setTimezone] = useState<string>('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    business_name: '',
    instagram_handle: '',
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [tableCount, setTableCount] = useState<number>(10);
  const passwordsEntered = form.password.length > 0 && form.confirmPassword.length > 0;
  const passwordsMatch = !passwordsEntered || form.password === form.confirmPassword;
  const ownerEmail = form.email.trim().toLowerCase();
  const ownerEmailEntered = ownerEmail.length > 0;
  const ownerEmailInvalid = ownerEmailEntered && !isValidOwnerEmail(ownerEmail);
  const ownerEmailWarning = ownerEmailEntered && !ownerEmailInvalid && hasSuspectEmailDomain(ownerEmail);

  const [masterPinAvailable, setMasterPinAvailable] = useState<boolean | null>(null);
  const [masterPin, setMasterPin] = useState('');
  const [masterPinConfirm, setMasterPinConfirm] = useState('');
  const masterPinValid = /^\d{4}$/.test(masterPin) && masterPin === masterPinConfirm;
  const [ownerApprovalPin, setOwnerApprovalPin] = useState('');
  const [ownerApprovalPinConfirm, setOwnerApprovalPinConfirm] = useState('');
  const ownerApprovalPinValid = /^\d{4,6}$/.test(ownerApprovalPin) && ownerApprovalPin === ownerApprovalPinConfirm;

  const isPasswordValid = (password: string) => {
    if (!password || password.length < 8) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    return true;
  };
  const passwordMeetsRequirements = form.password.length === 0 || isPasswordValid(form.password);
  const t = useTranslations('setup');
  const tSettings = useTranslations('settings');
  const locale = useLocale();
  const [mounted, setMounted] = useState(false);

  // Country labels are generated from CLDR data, which can differ between the server
  // and the browser even within the same locale. Keep the first paint deterministic
  // and only switch to the locale-specific names after hydration.
  const resolvedCountryLocale = mounted ? locale : 'en';

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMounted(true);
      setBrowserLanguage(getBrowserLanguage());
    });
    let mountedFlag = true;
    api.get('/auth/setup/status')
      .then(({ data }) => {
        if (!mountedFlag) return;
        setMasterPinAvailable(!!data.masterPinAvailable);
        if (data.currencyReset) {
          setCountry(String(data.currencyReset.country || ''));
          setCurrency(String(data.currencyReset.currency || ''));
          setTimezone(String(data.currencyReset.timezone || ''));
        }
        // Redirect to login if setup was already completed.
        if (!data.needsSetup) {
          toast.error(t('alreadyCompleted'));
          window.location.replace('/auth/login');
        }
      })
      .catch((err: unknown) => {
        if (!mountedFlag) return;
        console.warn('[Setup] Failed to check setup status:', err);
        setMasterPinAvailable(false);
      });
    return () => {
      mountedFlag = false;
      window.cancelAnimationFrame(frame);
    };
    // One-time mount check — the toast uses the initial language selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedCountry: Country | undefined = getCountryByCode(country);
  const languageOptions: Language[] = SELECTABLE_LANGUAGES.includes(browserLanguage)
    ? [browserLanguage, ...SELECTABLE_LANGUAGES.filter((l) => l !== browserLanguage)]
    : SELECTABLE_LANGUAGES;
  const filteredCountries = sortCountriesByLocalizedName(COUNTRIES, resolvedCountryLocale)
    .filter((c) => countryMatchesQuery(c, countryQuery, resolvedCountryLocale));

  const completeSetup = () => {
    usePosSettingsStore.getState().setLanguage(language);
    // Persist language server-side so the standalone KDS inherits it.
    api.put(`/settings/language`, { value: language }).catch((err: unknown) => {
      console.warn('[Setup] Failed to persist language setting:', err);
    });
    logout();
    toast.success(t('completeSetupSuccess'));
    window.location.replace('/auth/login');
  };

  const validateOwner = () => {
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      toast.error(t('errorNameRequired'));
      return false;
    }
    if (!isValidOwnerEmail(form.email.trim())) {
      toast.error(t('errorInvalidEmail'));
      return false;
    }
    if (!isPasswordValid(form.password)) {
      toast.error(t('errorPasswordRequirementsNotMet'));
      return false;
    }
    if (form.password !== form.confirmPassword) {
      toast.error(t('errorPasswordMismatch'));
      return false;
    }
    if (!termsAccepted) {
      toast.error(t('errorTermsRequired'));
      return false;
    }
    return true;
  };

  const handleOwnerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateOwner()) {
      handleCompleteSetup();
    }
  };

  const handleCompleteSetup = async () => {
    if (loading) return;
    if (!country) {
      toast.error(t('chooseCountryRequired'));
      setStep(1);
      return;
    }
    if (masterPinAvailable && !masterPinValid) {
      toast.error(t('masterPinRequired'));
      setStep(2);
      return;
    }
    if (!ownerApprovalPinValid) {
      toast.error(t('ownerApprovalPinRequired'));
      setStep(2);
      return;
    }
    if (!validateOwner()) {
      setStep(3);
      return;
    }

    setLoading(true);
    try {
      const countryProfile = selectedCountry;
      const countryCode = countryProfile?.code || country;
      const countryPayload = {
        country: countryCode,
        currency: currency || countryProfile?.currency,
        timezone,
        language,
      };

      await api.post('/auth/setup/initialize', {
        name: form.name,
        email: form.email,
        password: form.password,
        business_type: 'restaurant',
        business_name: form.business_name || undefined,
        instagram_handle: form.instagram_handle.trim() || undefined,
        table_count: Math.max(1, Math.min(100, Number(tableCount) || 10)),
        setup_profile: 'empty',
        service_model: 'finedine',
        terms_accepted: termsAccepted,
        master_pin: masterPinAvailable ? masterPin : undefined,
        owner_approval_pin: ownerApprovalPin,
        owner_approval_pin_confirmation: ownerApprovalPinConfirm,
        cloud_sync_enabled: false,
        cloud_server_url: '',
        email_product_updates: false,
        email_marketing: false,
        ...countryPayload,
      });
      completeSetup();
    } catch {
      toast.error(t('errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <img src="/restro-logo.png" alt="Restro Dash" className="h-14 w-auto object-contain mx-auto mb-4 restro-logo dark:brightness-0 dark:invert" />
          <h1 className="text-3xl font-bold">{t('welcome')}</h1>
          <p className="text-muted-foreground mt-2">{t('tagline')}</p>
        </div>

        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-3 h-3 rounded-full transition-colors ${
                s === step ? 'bg-primary' : s < step ? 'bg-primary/50' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <Card>
          <CardContent className="pt-6">
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-semibold mb-2">{t('chooseLanguage')}</h2>
                  <p className="text-muted-foreground text-sm">
                    {t('chooseLanguageHint')}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {languageOptions.map((option) => {
                    const selected = language === option;
                    const label = LANGUAGES[option].nativeName;
                    return (
                      <button
                        key={option}
                        onClick={() => setStoreLanguage(option)}
                        className={`p-4 rounded-xl border-2 text-start transition-all ${
                          selected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold">{label}</div>
                            <div className="text-xs text-muted-foreground mt-1">{option.toUpperCase()}</div>
                          </div>
                          {selected && <Check className="w-5 h-5 text-primary shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-medium">{t('chooseCountry')}</h3>
                    <p className="text-muted-foreground text-sm mt-1">{t('chooseCountryHint')}</p>
                  </div>

                  <div className="relative">
                    <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <Input
                      value={countryQuery}
                      onChange={(e) => setCountryQuery(e.target.value)}
                      placeholder={t('searchPlaceholder')}
                      className="ps-9"
                    />
                  </div>
                </div>

                <div className="grid gap-2 max-h-72 overflow-y-auto">
                  {filteredCountries.map((c) => {
                    const selected = country === c.code;
                    return (
                      <button
                        key={c.code}
                        onClick={() => {
                          const previousCountry = getCountryByCode(country);
                          setCountry(c.code);
                          if (!currency || currency === previousCountry?.currency) {
                            setCurrency(c.currency);
                          }
                          // Update default timezone when switching countries unless user has manually customized it.
                          if (!previousCountry || timezone === previousCountry.timezone) {
                            setTimezone(c.timezone || timezone);
                          }
                        }}
                        className={`p-3 rounded-xl border-2 text-start transition-all flex items-center justify-between ${
                          selected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div>
                          <div className="font-semibold">
                            {getLocalizedCountryName(c.code, resolvedCountryLocale)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {c.currency} · {c.taxIdLabel || t('noTaxId')} · {c.locale}
                          </div>
                        </div>
                        {selected && <Check className="w-5 h-5 text-primary" />}
                      </button>
                    );
                  })}
                  {countryQuery.trim() && filteredCountries.length === 0 && (
                    <p className="text-center text-gray-500 py-6 text-sm">{t('noMatches', { query: countryQuery })}</p>
                  )}
                </div>

                {selectedCountry ? (
                  <div className="space-y-2">
                    <Label htmlFor="setup-currency">{tSettings('currency')}</Label>
                    <CurrencySelect
                      id="setup-currency"
                      value={currency}
                      recommendedCurrency={selectedCountry.currency}
                      locale={locale}
                      onChange={setCurrency}
                      recommendedLabel={tSettings('currencyRecommended')}
                      popularLabel={tSettings('currencyPopular')}
                      allLabel={tSettings('currencyAll')}
                      className="h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                    />
                    <p className="text-xs text-muted-foreground">{tSettings('currencySelectionHint')}</p>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="setup-timezone">{t('timezoneLabel')}</Label>
                  <TimeZoneSelect
                    id="setup-timezone"
                    value={timezone}
                    onChange={setTimezone}
                    className="h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm"
                  />
                  <p className="text-xs text-muted-foreground">{t('timezoneHint')}</p>
                </div>

                <Button
                  onClick={() => {
                    if (!country) {
                      toast.error(t('chooseCountryRequired'));
                      return;
                    }
                    setStep(2);
                  }}
                  className="w-full"
                  size="lg"
                >
                  {t('continue')} <ArrowRight className="w-4 h-4 ms-2 rtl-flip" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 rtl-flip" /> {t('back')}
                </button>

                <div className="text-center">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <KeyRound className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">{t('setMasterPinTitle')}</h2>
                  <p className="text-muted-foreground text-sm">
                    {t('setMasterPinDescription')}
                  </p>
                  <p className="text-muted-foreground text-xs mt-2 bg-muted rounded-lg p-3">
                    {t('masterPinRecoveryNote')}
                  </p>
                </div>

                {masterPinAvailable === false ? (
                  <p className="text-sm text-center text-muted-foreground bg-muted rounded-lg p-4">
                    {t('masterPinNotAvailable')}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="master-pin">{t('pinLabel')}</Label>
                      <div className="relative">
                        <Input
                          id="master-pin"
                          type={showMasterPin ? "text" : "password"}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={4}
                          value={masterPin}
                          onChange={(e) => setMasterPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="••••"
                          className="text-center text-lg tracking-[0.5em] pe-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowMasterPin(!showMasterPin)}
                          className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                          tabIndex={-1}
                        >
                          {showMasterPin ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="master-pin-confirm">{t('confirmPinLabel')}</Label>
                      <div className="relative">
                        <Input
                          id="master-pin-confirm"
                          type={showConfirmMasterPin ? "text" : "password"}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={4}
                          value={masterPinConfirm}
                          onChange={(e) => setMasterPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="••••"
                          className="text-center text-lg tracking-[0.5em] pe-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmMasterPin(!showConfirmMasterPin)}
                          className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                          tabIndex={-1}
                        >
                          {showConfirmMasterPin ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3 rounded-lg border border-border px-3 py-3">
                  <div>
                    <h3 className="text-sm font-medium">{t('ownerApprovalPinLabel')}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{t('ownerApprovalPinDescription')}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="owner-approval-pin">{t('ownerApprovalPinLabel')}</Label>
                      <div className="relative">
                        <Input
                          id="owner-approval-pin"
                          type={showApprovalPin ? "text" : "password"}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          minLength={4}
                          maxLength={6}
                          value={ownerApprovalPin}
                          onChange={(e) => setOwnerApprovalPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="••••"
                          className="text-center text-lg tracking-[0.5em] pe-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowApprovalPin(!showApprovalPin)}
                          className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                          tabIndex={-1}
                        >
                          {showApprovalPin ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="owner-approval-pin-confirm">{t('confirmPinLabel')}</Label>
                      <div className="relative">
                        <Input
                          id="owner-approval-pin-confirm"
                          type={showConfirmApprovalPin ? "text" : "password"}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          minLength={4}
                          maxLength={6}
                          value={ownerApprovalPinConfirm}
                          onChange={(e) => setOwnerApprovalPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="••••"
                          className="text-center text-lg tracking-[0.5em] pe-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmApprovalPin(!showConfirmApprovalPin)}
                          className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                          tabIndex={-1}
                        >
                          {showConfirmApprovalPin ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                  {ownerApprovalPinConfirm && ownerApprovalPin !== ownerApprovalPinConfirm && (
                    <p className="text-xs font-medium text-red-600">{t('ownerApprovalPinMismatch')}</p>
                  )}
                </div>

                <Button
                  onClick={() => setStep(3)}
                  disabled={(masterPinAvailable === true && !masterPinValid) || !ownerApprovalPinValid}
                  className="w-full"
                  size="lg"
                >
                  {t('continue')} <ArrowRight className="w-4 h-4 ms-2 rtl-flip" />
                </Button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 rtl-flip" /> {t('back')}
                </button>

                <div className="text-center">
                  <h2 className="text-xl font-semibold mb-2">{t('createOwner')}</h2>
                  <p className="text-muted-foreground text-sm">{t('ownerSubtitle')}</p>
                </div>

                <form onSubmit={handleOwnerSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('ownerName')}</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder={t('ownerNamePlaceholder')}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('ownerEmail')}</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder={t('ownerEmailPlaceholder')}
                      aria-invalid={ownerEmailInvalid}
                      dir="ltr"
                      required
                    />
                    {ownerEmailInvalid && (
                      <p className="text-xs font-medium text-red-600">
                        {t('errorInvalidEmail')}
                      </p>
                    )}
                    {ownerEmailWarning && (
                      <p className="text-xs font-medium text-orange-600">
                        {t('ownerEmailDomainWarning')}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">{t('password')}</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          placeholder={t('passwordPlaceholder')}
                          className="pe-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          value={form.confirmPassword}
                          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                          placeholder={t('confirmPasswordPlaceholder')}
                          className="pe-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                  {!passwordMeetsRequirements && (
                    <p className="text-xs font-medium text-red-600">
                      {t('errorPasswordRequirementsNotMet')}
                    </p>
                  )}
                  {passwordsEntered && (
                    <p className={`text-xs font-medium ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordsMatch ? t('passwordsMatch') : t('passwordsMismatch')}
                    </p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="business_name">{t('businessName')}</Label>
                      <Input
                        id="business_name"
                        value={form.business_name}
                        onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                        placeholder={t('businessNamePlaceholder')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="table_count">Number of Dining Tables</Label>
                      <Input
                        id="table_count"
                        type="number"
                        min={1}
                        max={100}
                        value={tableCount}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setTableCount(isNaN(val) ? 1 : Math.max(1, Math.min(100, val)));
                        }}
                        placeholder="10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instagram_handle">{tSettings('instagramHandle')}</Label>
                    <Input
                      id="instagram_handle"
                      value={form.instagram_handle}
                      onChange={(e) => setForm({ ...form, instagram_handle: e.target.value })}
                      placeholder="@yourstore"
                      dir="ltr"
                      maxLength={100}
                    />
                    <p className="text-xs text-muted-foreground">{tSettings('instagramHandleHint')}</p>
                  </div>

                  <label className="flex items-start gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300"
                      required
                    />
                    <span>
                      {t('termsIntro')}{' '}
                      <span className="font-medium text-foreground">{t('terms')}</span>,{' '}
                      <span className="font-medium text-foreground">{t('privacy')}</span>, {t('termsAnd')}{' '}
                      <span className="font-medium text-foreground">{t('disclaimer')}</span>.
                    </span>
                  </label>


                  <Button type="submit" disabled={loading || ownerEmailInvalid || !passwordsMatch || !termsAccepted || !isPasswordValid(form.password)} className="w-full" size="lg">
                    {loading ? 'Setting up restaurant...' : 'Complete Setup & Launch Dashboard'} <ArrowRight className="w-4 h-4 ms-2 rtl-flip" />
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
