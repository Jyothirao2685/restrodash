'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form State
  const [subdomain, setSubdomain] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [serviceModel, setServiceModel] = useState<'finedine' | 'qsr'>('finedine');

  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [masterPin, setMasterPin] = useState('1234');
  const [approvalPin, setApprovalPin] = useState('1234');

  const [tableCount, setTableCount] = useState(12);
  const [currency, setCurrency] = useState('INR');
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [taxPercentage, setTaxPercentage] = useState(5.0);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  // Validation & Live Status
  const [subdomainChecking, setSubdomainChecking] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [subdomainError, setSubdomainError] = useState<string | null>(null);

  // Provisioning state
  const [provisioningStatus, setProvisioningStatus] = useState<string>('Initializing...');
  const [provisionedData, setProvisionedData] = useState<any | null>(null);
  const [provisionError, setProvisionError] = useState<string | null>(null);

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
      } catch (err) {
        setSubdomainAvailable(null);
      } finally {
        setSubdomainChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [subdomain]);

  const handleStartProvisioning = async () => {
    setStep(5);
    setProvisioningStatus('Allocating dedicated VPS directory & ports...');
    setProvisionError(null);

    try {
      await new Promise((r) => setTimeout(r, 600));
      setProvisioningStatus('Bootstrapping isolated restro.db (Schema v101)...');

      await new Promise((r) => setTimeout(r, 600));
      setProvisioningStatus('Generating table matrix & unique QR tokens...');

      const res = await fetch('/api/onboarding/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain: subdomain.trim().toLowerCase(),
          restaurantName: restaurantName.trim(),
          ownerName: ownerName.trim(),
          ownerEmail: ownerEmail.trim().toLowerCase(),
          ownerPassword: ownerPassword,
          masterPin,
          approvalPin,
          tableCount,
          currency,
          currencySymbol,
          timezone,
          taxPercentage,
          plan: billingCycle === 'monthly' ? 'monthly_35k' : 'annual',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to provision instance.');
      }

      setProvisioningStatus('Instance Ready! Initializing root session...');
      setProvisionedData(data);
    } catch (err: any) {
      console.error(err);
      setProvisionError(err.message || 'An error occurred during provisioning.');
    }
  };

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#333840] flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-[#dddddd] bg-[#ffffff] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[8px] bg-[#181d26] flex items-center justify-center p-1.5">
              <Image
                src="/restro-logo.png"
                alt="RestroDash Logo"
                width={24}
                height={24}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-medium text-[#181d26] text-[16px] tracking-tight">
              RestroDash
            </span>
          </Link>

          {/* Step Progress Tracker */}
          <div className="hidden sm:flex items-center gap-2 text-[13px] text-[#41454d]">
            <span className={step >= 1 ? 'font-medium text-[#181d26]' : ''}>1. Subdomain</span>
            <span>→</span>
            <span className={step >= 2 ? 'font-medium text-[#181d26]' : ''}>2. Owner</span>
            <span>→</span>
            <span className={step >= 3 ? 'font-medium text-[#181d26]' : ''}>3. Dining Floor</span>
            <span>→</span>
            <span className={step >= 4 ? 'font-medium text-[#181d26]' : ''}>4. Activation</span>
          </div>

          <Link href="/" className="text-[13px] text-[#41454d] hover:text-[#181d26]">
            Exit
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto px-6 py-12 w-full flex-1 flex flex-col justify-center">
        {/* Step 1: Brand & Subdomain */}
        {step === 1 && (
          <div>
            <span className="text-[12px] uppercase tracking-wider font-semibold text-[#181d26]/70 mb-2 block">
              Step 1 of 4 • Restaurant Identity
            </span>
            <h1 className="text-[28px] sm:text-[32px] font-normal text-[#181d26] leading-tight mb-3">
              Reserve your restaurant domain & profile.
            </h1>
            <p className="text-[15px] text-[#333840] mb-8 leading-relaxed">
              Every restaurant receives an isolated VPS instance and a dedicated subdomain with zero-lag routing.
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
                <label className="block text-[13px] font-medium text-[#181d26] mb-1.5">
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
                  className="w-full border border-[#dddddd] rounded-[8px] px-3.5 py-3 text-[14px] text-[#181d26] placeholder-[#9297a0] focus:outline-hidden focus:border-[#181d26]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#181d26] mb-1.5">
                  Desired Subdomain
                </label>
                <div className="flex items-center border border-[#dddddd] rounded-[8px] px-3.5 py-3 bg-[#ffffff] focus-within:border-[#181d26]">
                  <input
                    type="text"
                    required
                    placeholder="olivebistro"
                    value={subdomain}
                    onChange={(e) => {
                      setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                    }}
                    className="w-full text-[14px] text-[#181d26] placeholder-[#9297a0] focus:outline-hidden font-mono"
                  />
                  <span className="text-[13px] text-[#41454d] font-mono ml-2 select-none">
                    .restrodash.in
                  </span>
                </div>

                {/* Inline availability feedback */}
                <div className="mt-2 text-[12px]">
                  {subdomainChecking && (
                    <span className="text-[#41454d]">Checking availability...</span>
                  )}
                  {!subdomainChecking && subdomainAvailable === true && (
                    <span className="text-[#006400] font-medium">✓ Subdomain is available!</span>
                  )}
                  {!subdomainChecking && subdomainAvailable === false && (
                    <span className="text-[#aa2d00] font-medium">{subdomainError}</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#181d26] mb-1.5">
                  Service Model
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setServiceModel('finedine')}
                    className={`border rounded-[8px] p-3.5 cursor-pointer text-left transition-all ${
                      serviceModel === 'finedine'
                        ? 'border-[#181d26] bg-[#f8fafc]'
                        : 'border-[#dddddd] bg-[#ffffff] hover:border-[#9297a0]'
                    }`}
                  >
                    <div className="text-[14px] font-medium text-[#181d26]">Dine-In & Bar</div>
                    <div className="text-[12px] text-[#41454d] mt-0.5">Table seating, QR dining, KDS</div>
                  </div>

                  <div
                    onClick={() => setServiceModel('qsr')}
                    className={`border rounded-[8px] p-3.5 cursor-pointer text-left transition-all ${
                      serviceModel === 'qsr'
                        ? 'border-[#181d26] bg-[#f8fafc]'
                        : 'border-[#dddddd] bg-[#ffffff] hover:border-[#9297a0]'
                    }`}
                  >
                    <div className="text-[14px] font-medium text-[#181d26]">QSR / Counter</div>
                    <div className="text-[12px] text-[#41454d] mt-0.5">Fast counter checkout & KOT</div>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={!subdomainAvailable || !restaurantName.trim()}
                  className="btn-primary w-full py-3.5 text-[15px] disabled:opacity-40"
                >
                  Continue to Owner Account →
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 2: Owner Credentials & Security */}
        {step === 2 && (
          <div>
            <span className="text-[12px] uppercase tracking-wider font-semibold text-[#181d26]/70 mb-2 block">
              Step 2 of 4 • Admin Account
            </span>
            <h1 className="text-[28px] sm:text-[32px] font-normal text-[#181d26] leading-tight mb-3">
              Set up your root owner credentials.
            </h1>
            <p className="text-[15px] text-[#333840] mb-8 leading-relaxed">
              These credentials grant full administrative access to your POS counter, reports, and staff management.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (ownerName && ownerEmail && ownerPassword.length >= 6) {
                  setStep(3);
                }
              }}
              className="space-y-5"
            >
              <div>
                <label className="block text-[13px] font-medium text-[#181d26] mb-1.5">
                  Owner Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rohit Sharma"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full border border-[#dddddd] rounded-[8px] px-3.5 py-3 text-[14px] text-[#181d26] focus:outline-hidden focus:border-[#181d26]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#181d26] mb-1.5">
                  Owner Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="owner@olivebistro.com"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="w-full border border-[#dddddd] rounded-[8px] px-3.5 py-3 text-[14px] text-[#181d26] focus:outline-hidden focus:border-[#181d26]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#181d26] mb-1.5">
                  Admin Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  className="w-full border border-[#dddddd] rounded-[8px] px-3.5 py-3 text-[14px] text-[#181d26] focus:outline-hidden focus:border-[#181d26]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-[13px] font-medium text-[#181d26] mb-1.5">
                    Hardware Master PIN
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    placeholder="1234"
                    value={masterPin}
                    onChange={(e) => setMasterPin(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full border border-[#dddddd] rounded-[8px] px-3.5 py-2.5 text-[14px] font-mono text-center text-[#181d26] focus:outline-hidden focus:border-[#181d26]"
                  />
                  <span className="text-[11px] text-[#41454d] block mt-1">
                    4 digits for POS terminal lock
                  </span>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#181d26] mb-1.5">
                    Manager Approval PIN
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="1234"
                    value={approvalPin}
                    onChange={(e) => setApprovalPin(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full border border-[#dddddd] rounded-[8px] px-3.5 py-2.5 text-[14px] font-mono text-center text-[#181d26] focus:outline-hidden focus:border-[#181d26]"
                  />
                  <span className="text-[11px] text-[#41454d] block mt-1">
                    4-6 digits for voids & discounts
                  </span>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-secondary py-3 px-5 text-[14px]"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 py-3 text-[15px]"
                >
                  Continue to Dining Floor →
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Floor Setup & Tax */}
        {step === 3 && (
          <div>
            <span className="text-[12px] uppercase tracking-wider font-semibold text-[#181d26]/70 mb-2 block">
              Step 3 of 4 • Dining Room & Regional Settings
            </span>
            <h1 className="text-[28px] sm:text-[32px] font-normal text-[#181d26] leading-tight mb-3">
              Configure tables and currency.
            </h1>
            <p className="text-[15px] text-[#333840] mb-8 leading-relaxed">
              We will automatically seed your table matrix with cryptographically secure QR ordering codes.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setStep(4);
              }}
              className="space-y-6"
            >
              <div>
                <label className="block text-[13px] font-medium text-[#181d26] mb-1.5">
                  Number of Dining Tables
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[6, 12, 20, 36].map((count) => (
                    <button
                      type="button"
                      key={count}
                      onClick={() => setTableCount(count)}
                      className={`py-2.5 rounded-[8px] text-[14px] font-medium border transition-colors ${
                        tableCount === count
                          ? 'border-[#181d26] bg-[#181d26] text-[#ffffff]'
                          : 'border-[#dddddd] bg-[#ffffff] text-[#333840] hover:border-[#9297a0]'
                      }`}
                    >
                      {count} Tables
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-[13px] text-[#41454d]">Or enter custom:</span>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={tableCount}
                    onChange={(e) => setTableCount(parseInt(e.target.value) || 10)}
                    className="w-24 border border-[#dddddd] rounded-[6px] px-2.5 py-1 text-[13px] text-center font-medium text-[#181d26] focus:outline-hidden focus:border-[#181d26]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#181d26] mb-1.5">
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
                    className="w-full border border-[#dddddd] rounded-[8px] px-3 py-2.5 text-[14px] text-[#181d26] bg-[#ffffff] focus:outline-hidden focus:border-[#181d26]"
                  >
                    <option value="INR">INR (₹ Indian Rupee)</option>
                    <option value="USD">USD ($ US Dollar)</option>
                    <option value="EUR">EUR (€ Euro)</option>
                    <option value="AED">AED (UAE Dirham)</option>
                    <option value="GBP">GBP (£ British Pound)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#181d26] mb-1.5">
                    Store Timezone
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full border border-[#dddddd] rounded-[8px] px-3 py-2.5 text-[14px] text-[#181d26] bg-[#ffffff] focus:outline-hidden focus:border-[#181d26]"
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
                <label className="block text-[13px] font-medium text-[#181d26] mb-1.5">
                  Default GST / Tax Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={taxPercentage}
                  onChange={(e) => setTaxPercentage(parseFloat(e.target.value) || 0)}
                  className="w-full border border-[#dddddd] rounded-[8px] px-3.5 py-2.5 text-[14px] text-[#181d26] focus:outline-hidden focus:border-[#181d26]"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-secondary py-3 px-5 text-[14px]"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 py-3 text-[15px]"
                >
                  Continue to Plan & Launch →
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 4: Plan Confirmation & Payment */}
        {step === 4 && (
          <div>
            <span className="text-[12px] uppercase tracking-wider font-semibold text-[#181d26]/70 mb-2 block">
              Step 4 of 4 • Activation
            </span>
            <h1 className="text-[28px] sm:text-[32px] font-normal text-[#181d26] leading-tight mb-3">
              Confirm your dedicated restaurant instance.
            </h1>
            <p className="text-[15px] text-[#333840] mb-8 leading-relaxed">
              One flat subscription. Unlimited terminals, unlimited QR scans, full KDS, and your own dedicated cloud instance.
            </p>

            <div className="border border-[#dddddd] rounded-[12px] bg-[#f8fafc] p-6 mb-8">
              <div className="flex items-center justify-between pb-4 border-b border-[#dddddd] mb-4">
                <div>
                  <div className="text-[18px] font-medium text-[#181d26]">
                    RestroDash Dedicated Tier
                  </div>
                  <div className="text-[13px] text-[#41454d]">
                    Instance: <strong className="text-[#181d26]">{subdomain}.restrodash.in</strong>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[28px] font-medium text-[#181d26] leading-none">
                    ₹35,000
                  </div>
                  <span className="text-[12px] text-[#41454d]">/ month flat</span>
                </div>
              </div>

              <div className="space-y-2 text-[13px] text-[#333840]">
                <div className="flex items-center gap-2">
                  <span className="text-[#006400] font-medium">✓</span>
                  <span>Dedicated isolated SQLite database (<code>restro.db</code>)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#006400] font-medium">✓</span>
                  <span>{tableCount} tables pre-seeded with Host-Peer QR tokens</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#006400] font-medium">✓</span>
                  <span>Multi-station Kitchen Display Screen (KDS)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#006400] font-medium">✓</span>
                  <span>Raw ESC/POS thermal printing with golden column alignment</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#006400] font-medium">✓</span>
                  <span>0% commission on orders & unlimited staff accounts</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="btn-secondary py-3 px-5 text-[14px]"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleStartProvisioning}
                className="btn-primary flex-1 py-3.5 text-[15px] font-medium text-center justify-center"
              >
                Deploy Restaurant Instance Now
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Provisioning & Instant Launch */}
        {step === 5 && (
          <div className="text-center py-6">
            {!provisionedData && !provisionError && (
              <div>
                <div className="w-12 h-12 border-3 border-[#181d26] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                <h2 className="text-[24px] font-normal text-[#181d26] mb-2">
                  Provisioning Your Instance...
                </h2>
                <p className="text-[14px] text-[#41454d] font-mono mb-4">
                  {provisioningStatus}
                </p>
                <div className="text-[12px] text-[#9297a0]">
                  Target: {subdomain}.restrodash.in • SQLite WAL Engine
                </div>
              </div>
            )}

            {provisionError && (
              <div className="bg-[#fff1f0] border border-[#ffccc7] rounded-[12px] p-6 text-left">
                <h3 className="text-[18px] font-medium text-[#aa2d00] mb-2">
                  Provisioning Encountered an Error
                </h3>
                <p className="text-[14px] text-[#333840] mb-4">
                  {provisionError}
                </p>
                <button
                  onClick={() => setStep(4)}
                  className="btn-secondary text-[13px] py-2 px-4"
                >
                  ← Go Back and Retry
                </button>
              </div>
            )}

            {provisionedData && (
              <div className="border border-[#dddddd] rounded-[16px] p-8 bg-[#f8fafc] text-left">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-[#006400] text-white flex items-center justify-center text-[16px]">
                    ✓
                  </div>
                  <div>
                    <h2 className="text-[22px] font-normal text-[#181d26] leading-none">
                      Instance Provisioned Successfully!
                    </h2>
                    <span className="text-[13px] text-[#41454d]">
                      Your dedicated restaurant node is live.
                    </span>
                  </div>
                </div>

                <div className="border border-[#dddddd] rounded-[8px] bg-white p-4 space-y-2 text-[13px] mb-6">
                  <div className="flex justify-between">
                    <span className="text-[#41454d]">Subdomain:</span>
                    <strong className="text-[#181d26] font-mono">{provisionedData.subdomain}.restrodash.in</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#41454d]">Owner Email:</span>
                    <strong className="text-[#181d26]">{provisionedData.owner.email}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#41454d]">Assigned Ports:</span>
                    <strong className="text-[#181d26] font-mono">
                      API: :{provisionedData.ports.api} • KDS: :{provisionedData.ports.kds} • QR: :{provisionedData.ports.serverApp}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#41454d]">Database File:</span>
                    <strong className="text-[#181d26] font-mono text-[11px] truncate max-w-xs">{provisionedData.dbPath}</strong>
                  </div>
                </div>

                <div className="space-y-3">
                  <a
                    href={`http://localhost:${provisionedData.ports.api || 3001}/dashboard`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary w-full text-center justify-center py-3.5 text-[15px]"
                  >
                    Open Live POS Dashboard ↗
                  </a>
                  <Link
                    href="/"
                    className="btn-secondary w-full text-center justify-center py-2.5 text-[14px]"
                  >
                    Return to Homepage
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#dddddd] py-6 text-center text-[12px] text-[#41454d]">
        RestroDash Dedicated Restaurant Cloud • 100% Tenant Isolation • SQLite Powered
      </footer>
    </div>
  );
}
