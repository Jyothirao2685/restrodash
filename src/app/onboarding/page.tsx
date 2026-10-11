'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get('plan');

  const [step, setStep] = useState<1 | 2 | 3>(1);

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
  const [subdomainChecking, setSubdomainChecking] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [subdomainError, setSubdomainError] = useState<string | null>(null);

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

  const handleProceedToCheckout = () => {
    const onboardingData = {
      subdomain: subdomain.trim().toLowerCase(),
      restaurantName: restaurantName.trim(),
      serviceModel,
      ownerName: ownerName.trim(),
      ownerEmail: ownerEmail.trim().toLowerCase(),
      ownerPassword,
      masterPin,
      approvalPin,
      tableCount,
      currency,
      currencySymbol,
      timezone,
      taxPercentage,
      billingCycle,
    };

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('restrodash_onboarding_data', JSON.stringify(onboardingData));
    }

    router.push('/checkout');
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
            <span className={step >= 1 ? 'font-medium text-[#181818]' : ''}>1. Subdomain</span>
            <span className="opacity-40">→</span>
            <span className={step >= 2 ? 'font-medium text-[#181818]' : ''}>2. Owner & PIN</span>
            <span className="opacity-40">→</span>
            <span className={step >= 3 ? 'font-medium text-[#181818]' : ''}>3. Floor Setup</span>
            <span className="opacity-40">→</span>
            <span className="opacity-60">4. Checkout</span>
          </div>

          <Link href="/" className="text-[14px] text-[#5A564D] hover:text-[#181818] transition-colors">
            Exit
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto px-6 py-12 sm:py-16 w-full flex-1 flex flex-col justify-center">
        {/* Step 1: Brand & Subdomain */}
        {step === 1 && (
          <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E6E1D6] p-8 sm:p-12 shadow-xs">
            <h1 className="text-[30px] sm:text-[34px] font-normal text-[#181818] leading-[1.2] tracking-[-0.02em] mb-3">
              Reserve your restaurant domain & profile
            </h1>
            <p className="text-[16px] text-[#5A564D] mb-8 leading-[1.6]">
              Every restaurant receives an isolated cloud instance and a dedicated subdomain with zero-lag local sync.
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
                if (ownerName && ownerEmail && ownerPassword.length >= 6 && masterPin.length === 4 && approvalPin.length >= 4) {
                  setStep(3);
                }
              }}
              className="space-y-5"
            >
              <div>
                <label className="block text-[14px] font-medium text-[#181818] mb-1.5">
                  Owner Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rohit Sharma"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
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
                  onChange={(e) => setOwnerEmail(e.target.value)}
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
                  onChange={(e) => setOwnerPassword(e.target.value)}
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
                    onChange={(e) => setMasterPin(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full border border-[#8A857B] rounded-[12px] px-4 py-3 text-[16px] text-center tracking-widest text-[#181818] bg-[#FFFFFF] focus:outline-hidden focus:border-[#181818]"
                  />
                  <span className="text-[12px] text-[#5A564D] block mt-1">
                    4 digits for POS terminal lock
                  </span>
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#181818] mb-1.5">
                    Manager Approval PIN
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    required
                    maxLength={6}
                    placeholder="••••"
                    value={approvalPin}
                    onChange={(e) => setApprovalPin(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full border border-[#8A857B] rounded-[12px] px-4 py-3 text-[16px] text-center tracking-widest text-[#181818] bg-[#FFFFFF] focus:outline-hidden focus:border-[#181818]"
                  />
                  <span className="text-[12px] text-[#5A564D] block mt-1">
                    4-6 digits for voids & discounts
                  </span>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-ink bg-[#FFFFFF] text-[#181818] border-[#8A857B] hover:bg-[#F4F1EA] py-3 px-6 text-[14px]"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={!ownerName || !ownerEmail || ownerPassword.length < 6 || masterPin.length !== 4 || approvalPin.length < 4}
                  className="btn-ink flex-1 py-3 text-[15px] disabled:opacity-40"
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
                handleProceedToCheckout();
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

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-ink bg-[#FFFFFF] text-[#181818] border-[#8A857B] hover:bg-[#F4F1EA] py-3 px-6 text-[14px]"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="btn-ink flex-1 py-3 text-[15px]"
                >
                  Proceed to Checkout & Coupon →
                </button>
              </div>
            </form>
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
