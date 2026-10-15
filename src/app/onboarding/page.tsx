'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get('plan');

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State (NO PRE-FILLS)
  const [subdomain, setSubdomain] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [serviceModel, setServiceModel] = useState<'finedine' | 'qsr'>('finedine');

  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [masterPin, setMasterPin] = useState(''); // NO PRE-FILL
  const [approvalPin, setApprovalPin] = useState(''); // NO PRE-FILL

  const [tableCount, setTableCount] = useState(12);
  const [currency, setCurrency] = useState('INR');
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [taxPercentage, setTaxPercentage] = useState(5.0);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(
    planParam === 'annual' ? 'annual' : 'monthly'
  );

  // Validation & Live Status
  const [step2Error, setStep2Error] = useState<string | null>(null);
  const [subdomainChecking, setSubdomainChecking] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [subdomainError, setSubdomainError] = useState<string | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [provisionResult, setProvisionResult] = useState<any>(null);
  const [customDomain, setCustomDomain] = useState('');

  // Cloudflare Tunnel State (Permanent Named Tunnel & Quick Tunnel)
  const [tunnelState, setTunnelState] = useState<{
    status: string;
    mode: 'quick' | 'token';
    url: string | null;
    domain: string | null;
    hasTokenConfigured: boolean;
    expiresInMinutes: number;
    rotationIntervalHours: number;
    rotationCount: number;
    error: string | null;
  } | null>(null);
  const [tunnelLoading, setTunnelLoading] = useState(false);
  const [tunnelCopied, setTunnelCopied] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tokenSuccess, setTokenSuccess] = useState<string | null>(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  const fetchTunnelState = async () => {
    try {
      const res = await fetch('/api/tunnel');
      const data = await res.json();
      if (data.success) {
        setTunnelState(data);
        if (data.url && !customDomain) {
          setCustomDomain(data.url);
        }
        if (data.domain && !domainInput) {
          setDomainInput(data.domain);
        }
      }
      return data;
    } catch {
      return null;
    }
  };

  const handleStartQuickTunnel = async () => {
    setTunnelLoading(true);
    setTokenError(null);
    try {
      const res = await fetch('/api/tunnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', mode: 'quick' }),
      });
      const data = await res.json();
      setTunnelState(data);
      if (data.url) {
        setCustomDomain(data.url);
      }
    } catch (err: any) {
      console.error('Failed to start quick tunnel:', err);
    } finally {
      setTunnelLoading(false);
    }
  };

  const handleConnectPermanentTunnel = async (e: React.FormEvent) => {
    e.preventDefault();
    setTokenError(null);
    setTokenSuccess(null);
    if (!tokenInput.trim() || !domainInput.trim()) {
      setTokenError('Please enter both your Cloudflare Tunnel Token and your permanent domain.');
      return;
    }

    setTunnelLoading(true);
    try {
      const res = await fetch('/api/tunnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_token',
          token: tokenInput.trim(),
          domain: domainInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to connect permanent Cloudflare Named Tunnel.');
      }
      setTunnelState(data);
      setCustomDomain(data.url || domainInput.trim());
      setTokenSuccess('Permanent Cloudflare Named Tunnel connected! Your QR codes will never change.');
    } catch (err: any) {
      setTokenError(err.message || 'Error connecting permanent tunnel.');
    } finally {
      setTunnelLoading(false);
    }
  };

  const handleStopTunnel = async () => {
    setTunnelLoading(true);
    try {
      const res = await fetch('/api/tunnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
      const data = await res.json();
      setTunnelState(data);
    } catch (err) {
      console.error('Failed to stop tunnel:', err);
    } finally {
      setTunnelLoading(false);
    }
  };

  const handleRotateTunnel = async () => {
    setTunnelLoading(true);
    try {
      const res = await fetch('/api/tunnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rotate' }),
      });
      const data = await res.json();
      setTunnelState(data);
    } catch (err) {
      console.error('Failed to rotate tunnel:', err);
    } finally {
      setTunnelLoading(false);
    }
  };

  // Poll tunnel status upon entering Step 4
  useEffect(() => {
    if (step === 4) {
      fetchTunnelState().then((state) => {
        if (state?.hasTokenConfigured && state?.status !== 'active') {
          fetch('/api/tunnel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'start' }),
          }).then((r) => r.json()).then(setTunnelState).catch(() => {});
        }
      });
      const interval = setInterval(fetchTunnelState, 8000);
      return () => clearInterval(interval);
    }
  }, [step]);


  // Live subdomain availability check debounce
  useEffect(() => {
    if (!subdomain || subdomain.trim().length < 3) {
      setSubdomainAvailable(null);
      setSubdomainError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSubdomainChecking(true);
      try {
        const res = await fetch('/api/subdomain/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subdomain: subdomain.trim().toLowerCase() }),
        });
        const data = await res.json();
        setSubdomainAvailable(data.available);
        setSubdomainError(data.available ? null : (data.reason || 'Subdomain unavailable'));
      } catch {
        setSubdomainAvailable(null);
      } finally {
        setSubdomainChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [subdomain]);

  const handleLaunchRestaurant = async () => {
    setIsProvisioning(true);
    setProvisionError(null);
    try {
      const payload = {
        subdomain: subdomain.trim().toLowerCase(),
        restaurantName: restaurantName.trim(),
        serviceModel,
        ownerName: ownerName.trim(),
        ownerEmail: ownerEmail.trim().toLowerCase(),
        ownerPassword,
        masterPin: masterPin || '1234',
        approvalPin: approvalPin || masterPin || '1234',
        tableCount,
        currency,
        currencySymbol,
        timezone,
        taxPercentage,
      };

      const res = await fetch('/api/onboarding/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to setup restaurant instance.');
      }

      setProvisionResult(data);
      setStep(4);
    } catch (err: any) {
      setProvisionError(err.message || 'Error creating restaurant instance.');
    } finally {
      setIsProvisioning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFAF7] text-[#181818] flex flex-col justify-between selection:bg-[#181818] selection:text-[#FBFAF7]">
      {/* Top Header matching landing page */}
      <header className="border-b border-[#E6E1D6] bg-[#FBFAF7] sticky top-0 z-40 h-[72px]">
        <div className="max-w-[1200px] mx-auto px-6 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-[28px] flex items-center">
              <Image
                src="/restro-logo.png"
                alt="RestroDash"
                width={112}
                height={28}
                priority
                className="h-[28px] w-auto object-contain filter brightness-0"
              />
            </div>
          </Link>

          {/* Step Progress Tracker */}
          <div className="hidden sm:flex items-center gap-3 text-[14px] text-[#5A564D]">
            <span className={step >= 1 ? 'font-medium text-[#181818]' : ''}>1. Identity</span>
            <span className="opacity-40">→</span>
            <span className={step >= 2 ? 'font-medium text-[#181818]' : ''}>2. Owner & PIN</span>
            <span className="opacity-40">→</span>
            <span className={step >= 3 ? 'font-medium text-[#181818]' : ''}>3. Floor Setup</span>
            <span className="opacity-40">→</span>
            <span className={step >= 4 ? 'font-medium text-[#181818]' : ''}>4. Launch & QRs</span>
          </div>

          <Link href="/" className="text-[14px] text-[#5A564D] hover:text-[#181818] transition-colors">
            Exit
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className={`${step === 4 ? 'max-w-4xl' : 'max-w-2xl'} mx-auto px-6 py-12 sm:py-16 w-full flex-1 flex flex-col justify-center`}>
        {/* Step 1: Brand & Identifier */}
        {step === 1 && (
          <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E6E1D6] p-8 sm:p-12 shadow-xs">
            <h1 className="text-[30px] sm:text-[34px] font-normal text-[#181818] leading-[1.2] tracking-[-0.02em] mb-3">
              Set up your restaurant profile
            </h1>
            <p className="text-[16px] text-[#5A564D] mb-8 leading-[1.6]">
              Choose your restaurant name and identifier slug. You can run locally or connect any custom domain.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (subdomainAvailable && restaurantName.trim()) {
                  setStep(2);
                }
              }}
              className="space-y-6"
            >
              <div>
                <label className="block text-[14px] font-medium text-[#181818] mb-1.5">
                  Restaurant Brand Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Olive Bistro & Bar"
                  value={restaurantName}
                  onChange={(e) => {
                    setRestaurantName(e.target.value);
                    if (!subdomain) {
                      setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                    }
                  }}
                  className="w-full border border-[#8A857B] rounded-[12px] px-4 py-3 text-[15px] text-[#181818] bg-[#FFFFFF] placeholder-[#8A857B] focus:outline-hidden focus:border-[#181818]"
                />
              </div>

              <div>
                <label className="block text-[14px] font-medium text-[#181818] mb-1.5">
                  Desired Subdomain
                </label>
                <div className="flex items-center border border-[#8A857B] rounded-[12px] px-4 py-3 bg-[#FFFFFF] focus-within:border-[#181818]">
                  <input
                    type="text"
                    required
                    placeholder="olivebistro"
                    value={subdomain}
                    onChange={(e) => {
                      setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                    }}
                    className="w-full text-[15px] text-[#181818] placeholder-[#8A857B] focus:outline-hidden"
                  />
                  <span className="text-[14px] text-[#5A564D] ml-2 select-none">
                    .restrodash.in
                  </span>
                </div>

                {/* Inline availability feedback */}
                <div className="mt-2 text-[13px]">
                  {subdomainChecking && (
                    <span className="text-[#5A564D]">Checking availability...</span>
                  )}
                  {!subdomainChecking && subdomainAvailable === true && (
                    <span className="text-[#1F7A4D] font-medium">✓ Subdomain is available!</span>
                  )}
                  {!subdomainChecking && subdomainAvailable === false && (
                    <span className="text-[#B3261E] font-medium">{subdomainError}</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[14px] font-medium text-[#181818] mb-1.5">
                  Service Model
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setServiceModel('finedine')}
                    aria-pressed={serviceModel === 'finedine'}
                    className={`border rounded-[12px] p-4 cursor-pointer text-left transition-all ${
                      serviceModel === 'finedine'
                        ? 'border-[#181818] bg-[#F4F1EA]'
                        : 'border-[#E6E1D6] bg-[#FFFFFF] hover:border-[#8A857B]'
                    }`}
                  >
                    <div className="text-[15px] font-medium text-[#181818]">Dine-In & Bar</div>
                    <div className="text-[13px] text-[#5A564D] mt-0.5">Table seating, QR dining, KDS</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setServiceModel('qsr')}
                    aria-pressed={serviceModel === 'qsr'}
                    className={`border rounded-[12px] p-4 cursor-pointer text-left transition-all ${
                      serviceModel === 'qsr'
                        ? 'border-[#181818] bg-[#F4F1EA]'
                        : 'border-[#E6E1D6] bg-[#FFFFFF] hover:border-[#8A857B]'
                    }`}
                  >
                    <div className="text-[15px] font-medium text-[#181818]">QSR / Counter</div>
                    <div className="text-[13px] text-[#5A564D] mt-0.5">Fast counter checkout & KOT</div>
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!subdomainAvailable || !restaurantName.trim()}
                  className="btn-ink w-full py-3.5 text-[15px] disabled:opacity-40"
                >
                  Continue to Owner Account →
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 2: Owner Credentials & Starred Security PINs (NO PRE-FILLS) */}
        {step === 2 && (
          <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E6E1D6] p-8 sm:p-12 shadow-xs">
            <h1 className="text-[30px] sm:text-[34px] font-normal text-[#181818] leading-[1.2] tracking-[-0.02em] mb-3">
              Set up owner credentials and security PINs
            </h1>
            <p className="text-[16px] text-[#5A564D] mb-8 leading-[1.6]">
              These credentials grant administrative access to your counter terminals, reports, and staff authorization.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setStep2Error(null);
                if (!ownerName.trim()) {
                  setStep2Error('Please enter your full name.');
                  return;
                }
                if (!ownerEmail.trim()) {
                  setStep2Error('Please enter your email address.');
                  return;
                }
                if (ownerPassword.length < 6) {
                  setStep2Error('Admin password must be at least 6 characters.');
                  return;
                }
                if (masterPin.length !== 4) {
                  setStep2Error('Hardware Master PIN must be exactly 4 digits.');
                  return;
                }
                if (approvalPin && approvalPin.length < 4) {
                  setStep2Error('Manager Approval PIN must be at least 4 digits (or leave blank to match Master PIN).');
                  return;
                }
                setStep(3);
              }}
              className="space-y-5"
            >
              {step2Error && (
                <div className="p-3.5 rounded-[12px] bg-[#FFF0EF] border border-[#B3261E]/30 text-[#B3261E] text-[14px]">
                  {step2Error}
                </div>
              )}

              <div>
                <label className="block text-[14px] font-medium text-[#181818] mb-1.5">
                  Owner Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rohit Sharma"
                  value={ownerName}
                  onChange={(e) => {
                    setStep2Error(null);
                    setOwnerName(e.target.value);
                  }}
                  className="w-full border border-[#8A857B] rounded-[12px] px-4 py-3 text-[15px] text-[#181818] bg-[#FFFFFF] focus:outline-hidden focus:border-[#181818]"
                />
              </div>

              <div>
                <label className="block text-[14px] font-medium text-[#181818] mb-1.5">
                  Owner Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="owner@restaurant.com"
                  value={ownerEmail}
                  onChange={(e) => {
                    setStep2Error(null);
                    setOwnerEmail(e.target.value);
                  }}
                  className="w-full border border-[#8A857B] rounded-[12px] px-4 py-3 text-[15px] text-[#181818] bg-[#FFFFFF] focus:outline-hidden focus:border-[#181818]"
                />
              </div>

              <div>
                <label className="block text-[14px] font-medium text-[#181818] mb-1.5">
                  Admin Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  value={ownerPassword}
                  onChange={(e) => {
                    setStep2Error(null);
                    setOwnerPassword(e.target.value);
                  }}
                  className="w-full border border-[#8A857B] rounded-[12px] px-4 py-3 text-[15px] text-[#181818] bg-[#FFFFFF] focus:outline-hidden focus:border-[#181818]"
                />
              </div>

              {/* Starred Security PINs (NO PRE-FILLS, type="password") */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-[14px] font-medium text-[#181818] mb-1.5">
                    Hardware Master PIN
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    required
                    maxLength={4}
                    placeholder="••••"
                    value={masterPin}
                    onChange={(e) => {
                      setStep2Error(null);
                      setMasterPin(e.target.value.replace(/[^0-9]/g, ''));
                    }}
                    className="w-full border border-[#8A857B] rounded-[12px] px-4 py-3 text-[16px] text-center tracking-widest text-[#181818] bg-[#FFFFFF] focus:outline-hidden focus:border-[#181818]"
                  />
                  <span className="text-[12px] text-[#5A564D] block mt-1">
                    4 digits for POS terminal lock
                  </span>
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#181818] mb-1.5">
                    Manager Approval PIN <span className="text-[12px] font-normal text-[#5A564D]">(Optional)</span>
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Same as Master"
                    value={approvalPin}
                    onChange={(e) => {
                      setStep2Error(null);
                      setApprovalPin(e.target.value.replace(/[^0-9]/g, ''));
                    }}
                    className="w-full border border-[#8A857B] rounded-[12px] px-4 py-3 text-[16px] text-center tracking-widest text-[#181818] bg-[#FFFFFF] focus:outline-hidden focus:border-[#181818]"
                  />
                  <span className="text-[12px] text-[#5A564D] block mt-1">
                    Defaults to Master PIN if left blank
                  </span>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep2Error(null);
                    setStep(1);
                  }}
                  className="btn-ink bg-[#FFFFFF] text-[#181818] border-[#8A857B] hover:bg-[#F4F1EA] py-3 px-6 text-[14px]"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="btn-ink flex-1 py-3 text-[15px]"
                >
                  Continue to Dining Floor →
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Floor Setup & Configuration */}
        {step === 3 && (
          <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E6E1D6] p-8 sm:p-12 shadow-xs">
            <h1 className="text-[30px] sm:text-[34px] font-normal text-[#181818] leading-[1.2] tracking-[-0.02em] mb-3">
              Configure tables and currency
            </h1>
            <p className="text-[16px] text-[#5A564D] mb-8 leading-[1.6]">
              We will automatically seed your table matrix with secure QR ordering tokens.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLaunchRestaurant();
              }}
              className="space-y-6"
            >
              <div>
                <label className="block text-[14px] font-medium text-[#181818] mb-1.5">
                  Number of Dining Tables
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[6, 12, 20, 36].map((count) => (
                    <button
                      type="button"
                      key={count}
                      onClick={() => setTableCount(count)}
                      className={`py-2.5 rounded-[10px] text-[14px] font-medium border transition-colors ${
                        tableCount === count
                          ? 'border-[#181818] bg-[#181818] text-[#FFFFFF]'
                          : 'border-[#E6E1D6] bg-[#FFFFFF] text-[#181818] hover:border-[#8A857B]'
                      }`}
                    >
                      {count} Tables
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-[13px] text-[#5A564D]">Or custom count:</span>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={tableCount}
                    onChange={(e) => setTableCount(parseInt(e.target.value) || 10)}
                    className="w-24 border border-[#8A857B] rounded-[8px] px-3 py-1.5 text-[14px] text-center font-medium text-[#181818] bg-[#FFFFFF] focus:outline-hidden focus:border-[#181818]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[14px] font-medium text-[#181818] mb-1.5">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => {
                      setCurrency(e.target.value);
                      if (e.target.value === 'INR') setCurrencySymbol('₹');
                      if (e.target.value === 'USD') setCurrencySymbol('$');
                      if (e.target.value === 'EUR') setCurrencySymbol('€');
                      if (e.target.value === 'AED') setCurrencySymbol('AED');
                      if (e.target.value === 'GBP') setCurrencySymbol('£');
                    }}
                    className="w-full border border-[#8A857B] rounded-[12px] px-4 py-3 text-[14px] text-[#181818] bg-[#FFFFFF] focus:outline-hidden focus:border-[#181818]"
                  >
                    <option value="INR">INR (₹ Indian Rupee)</option>
                    <option value="USD">USD ($ US Dollar)</option>
                    <option value="EUR">EUR (€ Euro)</option>
                    <option value="AED">AED (UAE Dirham)</option>
                    <option value="GBP">GBP (£ British Pound)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#181818] mb-1.5">
                    Store Timezone
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full border border-[#8A857B] rounded-[12px] px-4 py-3 text-[14px] text-[#181818] bg-[#FFFFFF] focus:outline-hidden focus:border-[#181818]"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="America/New_York">America/New_York (EST/EDT)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                    <option value="UTC">UTC Standard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[14px] font-medium text-[#181818] mb-1.5">
                  Default GST / Tax Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={taxPercentage}
                  onChange={(e) => setTaxPercentage(parseFloat(e.target.value) || 0)}
                  className="w-full border border-[#8A857B] rounded-[12px] px-4 py-3 text-[14px] text-[#181818] bg-[#FFFFFF] focus:outline-hidden focus:border-[#181818]"
                />
              </div>

              {provisionError && (
                <div className="p-3.5 rounded-[12px] bg-[#FFF0EF] border border-[#B3261E]/30 text-[#B3261E] text-[14px]">
                  {provisionError}
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  disabled={isProvisioning}
                  onClick={() => setStep(2)}
                  className="btn-ink bg-[#FFFFFF] text-[#181818] border-[#8A857B] hover:bg-[#F4F1EA] py-3 px-6 text-[14px]"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={isProvisioning}
                  className="btn-ink flex-1 py-3 text-[15px] disabled:opacity-50"
                >
                  {isProvisioning ? 'Launching Restaurant...' : 'Launch Restaurant & Generate QRs →'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 4: Restaurant Launch & Table QR Hub */}
        {step === 4 && provisionResult && (
          <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E6E1D6] p-8 sm:p-12 shadow-xs space-y-8">
            <div className="text-center">
              <div className="w-14 h-14 bg-[#1F7A4D]/10 text-[#1F7A4D] rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                ✓
              </div>
              <h1 className="text-[28px] sm:text-[34px] font-normal text-[#181818] leading-[1.2] tracking-[-0.02em] mb-2">
                {restaurantName} is Ready!
              </h1>
              <p className="text-[16px] text-[#5A564D] leading-[1.6]">
                Your isolated restaurant database, staff credentials, and table QR tokens have been generated.
              </p>
            </div>

            {/* Quick App Launchers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <a
                href="/pos"
                target="_blank"
                className="p-5 rounded-[16px] bg-[#F4F1EA] border border-[#E6E1D6] hover:border-[#181818] transition-colors text-center"
              >
                <div className="text-[16px] font-medium text-[#181818]">Counter POS</div>
                <div className="text-[12px] text-[#5A564D] mt-1">Billing & KOT orders</div>
                <div className="text-[13px] font-bold text-[#181818] mt-3">Open POS →</div>
              </a>

              <a
                href="http://localhost:3002/kds"
                target="_blank"
                className="p-5 rounded-[16px] bg-[#F4F1EA] border border-[#E6E1D6] hover:border-[#181818] transition-colors text-center"
              >
                <div className="text-[16px] font-medium text-[#181818]">Kitchen Display (KDS)</div>
                <div className="text-[12px] text-[#5A564D] mt-1">Chef ticket screen</div>
                <div className="text-[13px] font-bold text-[#181818] mt-3">Open KDS →</div>
              </a>

              <a
                href="/server-standalone"
                target="_blank"
                className="p-5 rounded-[16px] bg-[#F4F1EA] border border-[#E6E1D6] hover:border-[#181818] transition-colors text-center"
              >
                <div className="text-[16px] font-medium text-[#181818]">Waiter Tableside</div>
                <div className="text-[12px] text-[#5A564D] mt-1">Mobile tableside app</div>
                <div className="text-[13px] font-bold text-[#181818] mt-3">Open Waiter App →</div>
              </a>
            </div>

            {/* Cloudflare Tunnel Controller: Permanent Named Tunnel (Solution 1) & Quick Test */}
            <div className="rounded-[16px] bg-[#FFFFFF] border border-[#E6E1D6] p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3.5 h-3.5 rounded-full ${
                      tunnelState?.status === 'active'
                        ? 'bg-[#1F7A4D] animate-pulse'
                        : tunnelState?.status === 'rotating'
                        ? 'bg-amber-500 animate-pulse'
                        : 'bg-[#B3261E]'
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-[16px] font-medium text-[#181818]">
                        {tunnelState?.mode === 'token' && tunnelState?.status === 'active'
                          ? 'Permanent Cloudflare Named Tunnel'
                          : 'Cloudflare Tunnel Connection'}
                      </h3>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          tunnelState?.status === 'active'
                            ? 'bg-[#1F7A4D]/10 text-[#1F7A4D]'
                            : tunnelState?.status === 'rotating'
                            ? 'bg-amber-500/10 text-amber-700'
                            : 'bg-[#B3261E]/10 text-[#B3261E]'
                        }`}
                      >
                        {tunnelState?.status === 'active'
                          ? tunnelState.mode === 'token'
                            ? 'Permanent (Never Rotates)'
                            : 'Temporary Quick Tunnel'
                          : 'Stopped'}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#5A564D] mt-0.5">
                      Connect your permanent restaurant domain to this counter PC without router port forwarding.
                    </p>
                  </div>
                </div>

                {/* Tunnel Stop / Disconnect Action */}
                {tunnelState?.status === 'active' && (
                  <button
                    type="button"
                    disabled={tunnelLoading}
                    onClick={handleStopTunnel}
                    className="px-3.5 py-1.5 rounded-[8px] bg-[#FFF0EF] hover:bg-[#FFE0DE] border border-[#B3261E]/30 text-[12px] font-medium text-[#B3261E] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Disconnect Tunnel
                  </button>
                )}
              </div>

              {/* Connected Permanent Named Tunnel Banner */}
              {tunnelState?.mode === 'token' && tunnelState?.status === 'active' && tunnelState.url && (
                <div className="p-4 rounded-[12px] bg-[#F4F1EA] border border-[#E6E1D6] space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-medium text-[#5A564D] uppercase tracking-wider block">
                        Permanent Ordering Domain:
                      </span>
                      <a
                        href={tunnelState.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[15px] font-mono text-[#181818] font-bold hover:underline"
                      >
                        {tunnelState.url}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (tunnelState?.url) {
                          navigator.clipboard.writeText(tunnelState.url);
                          setTunnelCopied(true);
                          setTimeout(() => setTunnelCopied(false), 2000);
                        }
                      }}
                      className="px-3 py-1.5 text-[12px] rounded-[8px] bg-[#FFFFFF] border border-[#8A857B] text-[#181818] hover:bg-[#F4F1EA] cursor-pointer"
                    >
                      {tunnelCopied ? 'Copied' : 'Copy Domain URL'}
                    </button>
                  </div>
                  <p className="text-[12px] text-[#1F7A4D] font-medium">
                    Permanent setup confirmed. Table QR codes will never change and do not need reprinting.
                  </p>
                </div>
              )}

              {/* Connected Quick Tunnel Banner */}
              {tunnelState?.mode === 'quick' && tunnelState?.status === 'active' && tunnelState.url && (
                <div className="p-4 rounded-[12px] bg-[#F4F1EA] border border-[#E6E1D6] space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-medium text-[#5A564D] uppercase tracking-wider block">
                        Temporary Quick URL (Testing Only):
                      </span>
                      <a
                        href={tunnelState.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[14px] font-mono text-[#181818] font-semibold hover:underline"
                      >
                        {tunnelState.url}
                      </a>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={tunnelLoading}
                        onClick={handleRotateTunnel}
                        className="px-3 py-1.5 text-[12px] rounded-[8px] bg-[#FFFFFF] border border-[#8A857B] text-[#181818] hover:bg-[#F4F1EA] cursor-pointer disabled:opacity-50"
                      >
                        Rotate URL
                      </button>
                    </div>
                  </div>
                  <p className="text-[12px] text-[#5A564D]">
                    This is an ephemeral testing tunnel. For permanent printed table QR codes, connect a Cloudflare Tunnel Token below.
                  </p>
                </div>
              )}

              {/* Form to Connect Permanent Named Tunnel (Solution 1) */}
              {(!tunnelState || tunnelState.mode !== 'token' || tunnelState.status !== 'active') && (
                <form onSubmit={handleConnectPermanentTunnel} className="space-y-4 pt-2">
                  <div className="border border-[#E6E1D6] rounded-[12px] p-4 bg-[#FBFAF7] space-y-3">
                    <div className="flex items-center justify-between">
                      <strong className="text-[14px] font-medium text-[#181818]">
                        Connect Permanent Custom Domain (Cloudflare Named Tunnel)
                      </strong>
                      <button
                        type="button"
                        onClick={() => setShowSetupGuide(!showSetupGuide)}
                        className="text-[12px] text-[#181818] underline cursor-pointer"
                      >
                        {showSetupGuide ? 'Hide Setup Guide' : 'Setup Guide (3 Steps)'}
                      </button>
                    </div>

                    {showSetupGuide && (
                      <div className="p-3.5 rounded-[8px] bg-[#FFFFFF] border border-[#E6E1D6] text-[12px] text-[#5A564D] space-y-2">
                        <p className="font-medium text-[#181818]">How to configure a free Cloudflare Named Tunnel:</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Go to Cloudflare Zero Trust (dash.cloudflare.com) and navigate to <strong>Networks → Tunnels</strong>.</li>
                          <li>Click <strong>Create a Tunnel</strong>, choose Cloudflared, name it, and copy the <strong>Token</strong>.</li>
                          <li>In the <strong>Public Hostnames</strong> tab, map your domain (e.g. <span className="font-mono text-[#181818]">order.mybistro.com</span>) to Service: <span className="font-mono text-[#181818]">HTTP localhost:3000</span>.</li>
                          <li>Paste your domain and token below and click Connect.</li>
                        </ol>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[12px] font-medium text-[#181818] mb-1">
                          Permanent Ordering Domain:
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. order.myrestaurant.com"
                          value={domainInput}
                          onChange={(e) => setDomainInput(e.target.value)}
                          className="w-full border border-[#8A857B] rounded-[8px] px-3 py-2 text-[13px] text-[#181818] bg-[#FFFFFF] focus:outline-hidden focus:border-[#181818]"
                        />
                      </div>

                      <div>
                        <label className="block text-[12px] font-medium text-[#181818] mb-1">
                          Cloudflare Tunnel Token:
                        </label>
                        <input
                          type="password"
                          required
                          placeholder="eyJhIjoi..."
                          value={tokenInput}
                          onChange={(e) => setTokenInput(e.target.value)}
                          className="w-full border border-[#8A857B] rounded-[8px] px-3 py-2 text-[13px] text-[#181818] bg-[#FFFFFF] focus:outline-hidden focus:border-[#181818]"
                        />
                      </div>
                    </div>

                    {tokenError && (
                      <p className="text-[12px] text-[#B3261E]">{tokenError}</p>
                    )}
                    {tokenSuccess && (
                      <p className="text-[12px] text-[#1F7A4D] font-medium">{tokenSuccess}</p>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={tunnelLoading}
                        className="btn-ink py-2 px-5 text-[13px] disabled:opacity-50"
                      >
                        {tunnelLoading ? 'Connecting...' : 'Connect Permanent Tunnel →'}
                      </button>

                      <button
                        type="button"
                        disabled={tunnelLoading}
                        onClick={handleStartQuickTunnel}
                        className="py-2 px-4 rounded-[8px] bg-[#FFFFFF] border border-[#8A857B] text-[13px] text-[#5A564D] hover:text-[#181818] disabled:opacity-50"
                      >
                        Or Start Temporary Quick Tunnel (Testing Only)
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>


            {/* Live Table QR Ordering Section */}
            <div className="border-t border-[#E6E1D6] pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-[18px] font-medium text-[#181818]">Table QR Dining Codes</h2>
                  <p className="text-[13px] text-[#5A564D]">
                    Customers scan these on their phones to view the menu and place orders.
                  </p>
                </div>
                <span className="text-[12px] text-[#5A564D] bg-[#F4F1EA] px-2.5 py-1 rounded-[6px]">
                  Routing via: <strong className="text-[#181818]">{customDomain.trim() || tunnelState?.url || 'http://localhost:3000'}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-[260px] overflow-y-auto p-1">
                {provisionResult.tables?.map((tbl: any) => {
                  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
                  const activeBase = customDomain.trim()
                    ? customDomain.startsWith('http')
                      ? customDomain
                      : `https://${customDomain}`
                    : tunnelState?.url || origin;
                  const qrUrl = `${activeBase}/m?token=${tbl.qrToken}`;
                  return (
                    <div
                      key={tbl.id}
                      className="p-3 rounded-[12px] border border-[#E6E1D6] bg-[#FFFFFF] hover:border-[#8A857B] transition-colors flex flex-col justify-between"
                    >
                      <div>
                        <span className="font-medium text-[#181818] text-[15px]">{tbl.number}</span>
                        <span className="text-[11px] text-[#5A564D] block truncate mt-0.5 font-mono">
                          {tbl.qrToken.slice(0, 14)}...
                        </span>
                      </div>
                      <a
                        href={qrUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[12px] font-bold text-[#1F7A4D] hover:underline mt-2 inline-block"
                      >
                        Test Menu Link ↗
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dedicated Instruction Box: Deployment Methods & Domain Settings */}
            <div className="rounded-[16px] bg-[#F4F1EA] border border-[#E6E1D6] p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🌐</span>
                <h3 className="text-[16px] font-medium text-[#181818]">
                  How QR Codes Reach Your Restaurant Computer
                </h3>
              </div>
              <p className="text-[13px] text-[#5A564D] leading-relaxed">
                If running on a counter PC (<code className="font-mono text-[#181818]">localhost</code>), a customer&apos;s phone cannot reach localhost directly. RestroDash solves this with 3 deployment options:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[13px]">
                <div className="p-3.5 bg-[#FFFFFF] rounded-[12px] border border-[#E6E1D6]">
                  <strong className="block text-[#181818] mb-1 font-medium">1. Automatic Cloudflare Tunnel (Active)</strong>
                  <p className="text-[#5A564D] text-[12px] mb-2">Zero configuration. Running automatically above.</p>
                  <p className="text-[#5A564D] text-[11px]">
                    Provides an instant public HTTPS URL with automatic 8-hour security rotation and night shift killswitch.
                  </p>
                </div>

                <div className="p-3.5 bg-[#FFFFFF] rounded-[12px] border border-[#E6E1D6]">
                  <strong className="block text-[#181818] mb-1 font-medium">2. Cloud VPS & Custom Domain</strong>
                  <p className="text-[#5A564D] text-[12px] mb-2">Recommended for permanent stickers.</p>
                  <p className="text-[#5A564D] text-[12px]">
                    Point your domain (e.g. <span className="font-mono text-[#181818]">order.myrestaurant.com</span>) to your VPS IP, then run Docker or PM2.
                  </p>
                </div>

                <div className="p-3.5 bg-[#FFFFFF] rounded-[12px] border border-[#E6E1D6]">
                  <strong className="block text-[#181818] mb-1 font-medium">3. Local Wi-Fi (100% Offline)</strong>
                  <p className="text-[#5A564D] text-[12px] mb-2">Zero internet needed.</p>
                  <p className="text-[#5A564D] text-[12px]">
                    Connect customers to your guest Wi-Fi and use your counter PC&apos;s LAN IP (e.g. <span className="font-mono text-[#181818]">http://192.168.1.50:3000</span>).
                  </p>
                </div>
              </div>

              {/* Custom Domain Override Input */}
              <div className="pt-2">
                <label className="block text-[12px] font-medium text-[#181818] mb-1">
                  Override Table QR Base URL with a Custom Domain:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. https://order.mybistro.com"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    className="flex-1 border border-[#8A857B] rounded-[8px] px-3 py-1.5 text-[13px] text-[#181818] bg-[#FFFFFF] focus:outline-hidden focus:border-[#181818]"
                  />
                  {customDomain && (
                    <button
                      type="button"
                      onClick={() => setCustomDomain('')}
                      className="px-3 py-1 text-[12px] border border-[#8A857B] rounded-[8px] bg-[#FFFFFF] text-[#5A564D] hover:text-[#181818]"
                    >
                      Reset to Tunnel URL
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer Minimal */}
      <footer className="border-t border-[#E6E1D6] py-6 px-6 text-center text-[13px] text-[#5A564D]">
        <div className="max-w-[1200px] mx-auto">
          © {new Date().getFullYear()} RestroDash Technologies Inc. • Authoritative Offline-First POS Engine
        </div>
      </footer>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#FBFAF7] flex items-center justify-center text-[15px] text-[#5A564D]">
          Loading onboarding...
        </div>
      }
    >
      <OnboardingContent />
    </React.Suspense>
  );
}
