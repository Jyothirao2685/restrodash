'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface OnboardingData {
  subdomain: string;
  restaurantName: string;
  serviceModel: 'finedine' | 'qsr';
  ownerName: string;
  ownerEmail: string;
  ownerPassword?: string;
  masterPin: string;
  approvalPin: string;
  tableCount: number;
  currency: string;
  currencySymbol: string;
  timezone: string;
  taxPercentage: number;
  billingCycle: 'monthly' | 'annual';
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export default function CheckoutPage() {
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    type: 'percent' | 'flat';
    value: number;
    description: string;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Payment & Provisioning State
  const [loading, setLoading] = useState(false);
  const [provisioningStatus, setProvisioningStatus] = useState<string>('');
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [provisionedSuccess, setProvisionedSuccess] = useState<any | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('restrodash_onboarding_data');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setOnboardingData(parsed);
          if (parsed.billingCycle) {
            setBillingCycle(parsed.billingCycle);
          }
        } catch {
          // Fallback
        }
      }
    }
  }, []);

  // Pricing calculations
  const basePrice = billingCycle === 'monthly' ? 35000 : 350000;

  let discount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percent') {
      discount = (basePrice * appliedCoupon.value) / 100;
    } else if (appliedCoupon.type === 'flat') {
      discount = Math.min(appliedCoupon.value, basePrice);
    }
  }

  const netAmount = Math.max(0, basePrice - discount);
  const gst = netAmount > 0 ? Math.round(netAmount * 0.18) : 0;
  const finalTotal = netAmount + gst;

  // Coupon handler
  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    const code = couponCode.trim().toUpperCase();

    if (!code) return;

    if (code === 'LAUNCH50') {
      setAppliedCoupon({
        code: 'LAUNCH50',
        type: 'percent',
        value: 50,
        description: '50% Inaugural Launch Discount',
      });
      setCouponCode('');
    } else if (code === 'FREE100' || code === 'PILOT100' || code === 'TRIAL100') {
      setAppliedCoupon({
        code,
        type: 'percent',
        value: 100,
        description: '100% Free Pilot / Trial Activation (₹0)',
      });
      setCouponCode('');
    } else if (code === 'RESTRO10K' || code === 'SAVE10K') {
      setAppliedCoupon({
        code,
        type: 'flat',
        value: 10000,
        description: '₹10,000 Flat Restaurant Discount',
      });
      setCouponCode('');
    } else {
      setCouponError('Invalid coupon code. Try "LAUNCH50" or "PILOT100".');
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
  };

  // Provisioning trigger
  const triggerProvisioning = async (paymentId: string) => {
    setLoading(true);
    setProvisionError(null);
    setProvisioningStatus('Allocating dedicated VPS directory & ports...');

    try {
      await new Promise((r) => setTimeout(r, 600));
      setProvisioningStatus('Bootstrapping isolated restro.db (Schema v101)...');

      await new Promise((r) => setTimeout(r, 600));
      setProvisioningStatus('Generating table matrix & unique QR tokens...');

      const payload = {
        subdomain: onboardingData?.subdomain || 'restaurant',
        restaurantName: onboardingData?.restaurantName || 'Restaurant',
        ownerName: onboardingData?.ownerName || 'Admin',
        ownerEmail: onboardingData?.ownerEmail || 'admin@restaurant.com',
        ownerPassword: onboardingData?.ownerPassword || 'password123',
        masterPin: onboardingData?.masterPin || '1234',
        approvalPin: onboardingData?.approvalPin || '1234',
        tableCount: onboardingData?.tableCount || 12,
        currency: onboardingData?.currency || 'INR',
        currencySymbol: onboardingData?.currencySymbol || '₹',
        timezone: onboardingData?.timezone || 'Asia/Kolkata',
        taxPercentage: onboardingData?.taxPercentage || 5.0,
        plan: billingCycle === 'monthly' ? 'monthly_35k' : 'annual',
        payment: {
          paymentId,
          amount: finalTotal,
          couponCode: appliedCoupon?.code || null,
        },
      };

      const res = await fetch('/api/onboarding/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to provision dedicated instance.');
      }

      setProvisioningStatus('Instance Ready! Initializing root session...');
      setProvisionedSuccess(data);
    } catch (err: any) {
      setProvisionError(err.message || 'Provisioning error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Razorpay Checkout handler
  const handlePayment = async () => {
    if (finalTotal === 0) {
      await triggerProvisioning('FREE_COUPON_ACTIVATION_' + Date.now());
      return;
    }

    setLoading(true);

    if (!window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);

      await new Promise((resolve) => {
        script.onload = resolve;
      });
    }

    const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_placeholder';

    if (razorpayKey === 'rzp_test_placeholder') {
      const confirmed = window.confirm(
        `[Razorpay Payment Gateway]\nTotal Payable: ₹${finalTotal.toLocaleString('en-IN')}\n\nClick OK to simulate successful Razorpay payment authorization.`
      );
      if (confirmed) {
        await triggerProvisioning('pay_test_' + Math.random().toString(36).substring(7));
      } else {
        setLoading(false);
      }
      return;
    }

    try {
      const options = {
        key: razorpayKey,
        amount: finalTotal * 100,
        currency: 'INR',
        name: 'RestroDash Technologies',
        description: `Dedicated POS Node - ${onboardingData?.restaurantName || 'Restaurant'}`,
        image: '/restro-logo.png',
        handler: async (response: any) => {
          await triggerProvisioning(response.razorpay_payment_id || 'pay_' + Date.now());
        },
        prefill: {
          name: onboardingData?.ownerName || '',
          email: onboardingData?.ownerEmail || '',
        },
        theme: {
          color: '#181818',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        setProvisionError(`Payment failed: ${response.error?.description || 'Declined'}`);
        setLoading(false);
      });
      rzp.open();
    } catch {
      setProvisionError('Unable to open payment gateway. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFAF7] text-[#181818] flex flex-col justify-between selection:bg-[#181818] selection:text-[#FBFAF7]">
      {/* Top Header */}
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

          <div className="flex items-center gap-2 text-[14px] text-[#5A564D]">
            <span>Secure 256-bit encrypted checkout</span>
          </div>

          <Link href="/onboarding" className="text-[14px] text-[#5A564D] hover:text-[#181818] transition-colors">
            ← Back
          </Link>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-[1200px] mx-auto px-6 py-12 sm:py-16 w-full flex-1">
        {provisionedSuccess ? (
          /* Success Screen */
          <div className="max-w-xl mx-auto bg-[#FFFFFF] rounded-[24px] border border-[#E6E1D6] p-8 sm:p-12 text-center shadow-xs">
            <div className="w-14 h-14 rounded-full bg-[#1F7A4D] text-[#FFFFFF] flex items-center justify-center mx-auto mb-6 text-[24px]">
              ✓
            </div>
            <h1 className="text-[30px] sm:text-[34px] font-normal text-[#181818] leading-[1.2] tracking-[-0.02em] mb-4">
              Your restaurant instance is ready
            </h1>
            <p className="text-[16px] text-[#5A564D] leading-[1.6] mb-8">
              We have allocated your dedicated cloud instance, seeded your database, and activated your table QR codes.
            </p>

            <div className="bg-[#F4F1EA] rounded-[16px] p-6 border border-[#E6E1D6] text-left mb-8 space-y-2.5 text-[15px]">
              <div className="flex justify-between">
                <span className="text-[#5A564D]">Restaurant</span>
                <span className="font-medium text-[#181818]">{onboardingData?.restaurantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5A564D]">Subdomain</span>
                <span className="font-medium text-[#181818]">{onboardingData?.subdomain}.restrodash.in</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5A564D]">Tables Seeded</span>
                <span className="font-medium text-[#181818]">{onboardingData?.tableCount || 12} Tables</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5A564D]">Database</span>
                <span className="font-medium text-[#181818]">Dedicated restro.db</span>
              </div>
            </div>

            <div className="space-y-3">
              <a
                href={`https://${onboardingData?.subdomain}.restrodash.in`}
                className="btn-ink w-full py-3.5 text-[15px] justify-center"
              >
                Go to Restaurant Dashboard →
              </a>
              <Link
                href="/"
                className="inline-block text-[14px] text-[#5A564D] hover:text-[#181818] pt-2"
              >
                Return to RestroDash Homepage
              </Link>
            </div>
          </div>
        ) : (
          /* Checkout Grid */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-start">
            {/* Left Column (7 cols): Order Summary & Instance Specs */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E6E1D6] p-8 sm:p-10 shadow-xs">
                <h1 className="text-[28px] sm:text-[32px] font-normal text-[#181818] leading-[1.2] tracking-[-0.02em] mb-2">
                  {onboardingData?.restaurantName || 'Restaurant'} Deployment
                </h1>
                <p className="text-[15px] text-[#5A564D] mb-6">
                  Target instance: <strong className="text-[#181818]">{onboardingData?.subdomain || 'your-subdomain'}.restrodash.in</strong>
                </p>

                {/* Plan switcher */}
                <div className="flex items-center gap-3 p-1.5 bg-[#F4F1EA] rounded-[12px] border border-[#E6E1D6] text-[14px] font-medium mb-8">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`flex-1 py-2.5 rounded-[8px] transition-colors ${
                      billingCycle === 'monthly'
                        ? 'bg-[#181818] text-[#FFFFFF]'
                        : 'text-[#5A564D] hover:text-[#181818]'
                    }`}
                  >
                    Monthly (₹35,000 / mo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('annual')}
                    className={`flex-1 py-2.5 rounded-[8px] transition-colors ${
                      billingCycle === 'annual'
                        ? 'bg-[#181818] text-[#FFFFFF]'
                        : 'text-[#5A564D] hover:text-[#181818]'
                    }`}
                  >
                    Annual (Save 17%)
                  </button>
                </div>

                {/* Specifications checklist */}
                <div className="divide-y divide-[#E6E1D6] text-[15px]">
                  <div className="py-3 flex justify-between">
                    <span className="text-[#5A564D]">Tenant Architecture</span>
                    <span className="font-medium text-[#181818]">Dedicated Cloud Instance (Private restro.db)</span>
                  </div>
                  <div className="py-3 flex justify-between">
                    <span className="text-[#5A564D]">Local Terminals</span>
                    <span className="font-medium text-[#181818]">Unlimited Local Counter Nodes</span>
                  </div>
                  <div className="py-3 flex justify-between">
                    <span className="text-[#5A564D]">Kitchen Displays</span>
                    <span className="font-medium text-[#181818]">Multi-Station KDS Screens</span>
                  </div>
                  <div className="py-3 flex justify-between">
                    <span className="text-[#5A564D]">Tableside Dining</span>
                    <span className="font-medium text-[#181818]">Host-Peer QR ({onboardingData?.tableCount || 12} tables)</span>
                  </div>
                  <div className="py-3 flex justify-between">
                    <span className="text-[#5A564D]">Commission Fee</span>
                    <span className="font-medium text-[#181818]">0% Per-Order Commission</span>
                  </div>
                </div>
              </div>

              {/* Owner Account Summary */}
              <div className="bg-[#FFFFFF] rounded-[20px] border border-[#E6E1D6] p-6 text-[15px]">
                <div className="text-[14px] font-medium text-[#181818] mb-3">
                  Owner credentials & access
                </div>
                <div className="grid grid-cols-2 gap-4 text-[14px]">
                  <div>
                    <span className="text-[#5A564D] block text-[13px]">Admin Account</span>
                    <span className="font-medium text-[#181818]">{onboardingData?.ownerEmail || 'Not set'}</span>
                  </div>
                  <div>
                    <span className="text-[#5A564D] block text-[13px]">Master PIN</span>
                    <span className="font-medium text-[#181818]">•••• (Configured)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): Coupon System & Razorpay Checkout */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E6E1D6] p-8 shadow-xs">
                <h2 className="text-[22px] font-medium text-[#181818] mb-6">
                  Payment summary
                </h2>

                {/* Coupon Code Box */}
                <div className="mb-6 pb-6 border-b border-[#E6E1D6]">
                  <label className="block text-[14px] font-medium text-[#181818] mb-2">
                    Have a coupon code?
                  </label>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-3.5 rounded-[12px] bg-[#F4F1EA] border border-[#E6E1D6] text-[14px]">
                      <div>
                        <span className="font-medium text-[#1F7A4D]">{appliedCoupon.code}</span>
                        <span className="text-[#5A564D] block text-[12px]">{appliedCoupon.description}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-[#B3261E] hover:underline text-[13px] font-medium cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. LAUNCH50 or PILOT100"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value);
                          setCouponError(null);
                        }}
                        className="flex-1 px-4 py-2.5 rounded-[12px] border border-[#8A857B] text-[14px] uppercase bg-[#FFFFFF] text-[#181818] focus:outline-hidden focus:border-[#181818]"
                      />
                      <button
                        type="submit"
                        disabled={!couponCode.trim()}
                        className="btn-ink py-2.5 px-5 text-[14px] disabled:opacity-40"
                      >
                        Apply
                      </button>
                    </form>
                  )}

                  {couponError && (
                    <p className="mt-2 text-[13px] text-[#B3261E]">
                      {couponError}
                    </p>
                  )}

                  <div className="mt-2.5 text-[12px] text-[#5A564D]">
                    Available coupons: <code className="bg-[#F4F1EA] px-1.5 py-0.5 rounded text-[#181818]">LAUNCH50</code> (50% off) or <code className="bg-[#F4F1EA] px-1.5 py-0.5 rounded text-[#181818]">PILOT100</code> (100% off / ₹0)
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="space-y-3.5 text-[15px] mb-8">
                  <div className="flex justify-between text-[#5A564D]">
                    <span>Dedicated Instance ({billingCycle})</span>
                    <span>₹{basePrice.toLocaleString('en-IN')}</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-[#1F7A4D]">
                      <span>Coupon Discount ({appliedCoupon?.code})</span>
                      <span>-₹{discount.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-[#5A564D]">
                    <span>GST (18%)</span>
                    <span>₹{gst.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="pt-4 border-t border-[#E6E1D6] flex justify-between items-baseline text-[18px] font-medium text-[#181818]">
                    <span>Total Amount</span>
                    <span className="text-[26px] font-medium tracking-[-0.02em]">
                      ₹{finalTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {provisionError && (
                  <div className="mb-4 p-3.5 rounded-[12px] bg-[#FFF0EF] border border-[#B3261E] text-[#B3261E] text-[14px]">
                    {provisionError}
                  </div>
                )}

                {/* Provisioning In Progress State */}
                {loading && (
                  <div className="mb-4 p-4 rounded-[12px] bg-[#F4F1EA] border border-[#E6E1D6] text-center">
                    <div className="animate-spin w-6 h-6 border-2 border-[#181818] border-t-transparent rounded-full mx-auto mb-2" />
                    <div className="text-[14px] text-[#181818]">{provisioningStatus}</div>
                  </div>
                )}

                {/* Action Button: Razorpay Payment or ₹0 Activation */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={handlePayment}
                  className="btn-ink w-full py-4 text-[15px] font-medium justify-center cursor-pointer disabled:opacity-50"
                >
                  {loading
                    ? 'Processing...'
                    : finalTotal === 0
                    ? 'Activate Instance (₹0 Pilot) →'
                    : `Pay with Razorpay (₹${finalTotal.toLocaleString('en-IN')}) →`}
                </button>

                <div className="mt-4 text-center text-[12px] text-[#5A564D]">
                  Powered by Razorpay • Instant automated provisioning
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Minimal */}
      <footer className="border-t border-[#E6E1D6] py-6 px-6 text-center text-[13px] text-[#5A564D]">
        <div className="max-w-[1200px] mx-auto">
          © {new Date().getFullYear()} RestroDash Technologies Inc. • Authorized Payment & Provisioning Gateway
        </div>
      </footer>
    </div>
  );
}
