'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { copy } from '@/content/copy';

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  return (
    <section id="pricing" className="py-24 sm:py-32 bg-[#FBFAF7] text-[#181818] scroll-mt-[88px]">
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-[760px] mx-auto mb-16 sm:mb-20">
          <h2 className="text-[32px] sm:text-[44px] lg:text-[48px] font-normal leading-[1.15] text-[#181818] tracking-[-0.02em] mb-4">
            {copy.pricing.h2}
          </h2>
          <p className="text-[17px] font-normal leading-[1.6] text-[#5A564D]">
            {copy.pricing.sub}
          </p>

          {/* Billing Switcher */}
          <div className="inline-flex items-center bg-[#FFFFFF] p-1.5 rounded-[12px] border border-[#E6E1D6] mt-8 text-[14px]">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              aria-pressed={billingCycle === 'monthly'}
              className={`px-5 py-2 rounded-[8px] font-medium transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-[#181818] text-[#FFFFFF]'
                  : 'text-[#5A564D] hover:text-[#181818]'
              }`}
            >
              Monthly billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              aria-pressed={billingCycle === 'annual'}
              className={`px-5 py-2 rounded-[8px] font-medium transition-colors ${
                billingCycle === 'annual'
                  ? 'bg-[#181818] text-[#FFFFFF]'
                  : 'text-[#5A564D] hover:text-[#181818]'
              }`}
            >
              Annual billing (Save 17%)
            </button>
          </div>
        </div>

        {/* Pricing Card */}
        <div className="max-w-[960px] mx-auto bg-[#FFFFFF] border border-[#E6E1D6] rounded-[24px] p-8 sm:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Left: Price & CTA (6 cols) */}
            <div className="lg:col-span-6">
              <h3 className="text-[26px] sm:text-[28px] font-normal text-[#181818] mb-3">
                RestroDash Dedicated Tier
              </h3>
              <p className="text-[15px] text-[#5A564D] mb-8 leading-relaxed">
                Everything required to run high-volume dine-in, takeaway, multi-station KDS, and tableside QR ordering.
              </p>

              <div className="mb-8 p-6 rounded-[16px] bg-[#F4F1EA] border border-[#E6E1D6]">
                <div className="flex items-baseline gap-2">
                  <span className="text-[42px] sm:text-[48px] font-medium text-[#181818] tracking-[-0.03em] leading-none">
                    {billingCycle === 'monthly' ? '₹35,000' : '₹29,166'}
                  </span>
                  <span className="text-[16px] font-normal text-[#5A564D]">
                    / month
                  </span>
                </div>
                <p className="text-[14px] font-normal text-[#5A564D] mt-2">
                  {billingCycle === 'annual'
                    ? 'Billed annually at ₹3,50,000 / year (2 months free)'
                    : 'Billed monthly • Cancel anytime'}
                </p>
              </div>

              <Link
                href={`/onboarding?plan=${billingCycle}`}
                className="btn-ink w-full text-center justify-center text-[15px] py-3.5"
              >
                {copy.pricing.cta} →
              </Link>
            </div>

            {/* Right: Deliverables List (6 cols) */}
            <div className="lg:col-span-6 border-t lg:border-t-0 lg:border-l border-[#E6E1D6] pt-8 lg:pt-0 lg:pl-10">
              <div className="text-[14px] font-medium text-[#181818] mb-5">
                Included with dedicated instance:
              </div>

              <ul className="space-y-3.5 text-[15px] text-[#5A564D]">
                {copy.pricing.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-[#181818] font-bold mt-0.5">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
