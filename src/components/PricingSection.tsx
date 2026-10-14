'use client';

import React from 'react';
import Link from 'next/link';

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 sm:py-32 bg-[#FBFAF7] text-[#181818] scroll-mt-[88px]">
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-[760px] mx-auto mb-16 sm:mb-20">
          <h2 className="text-[32px] sm:text-[44px] lg:text-[48px] font-normal leading-[1.15] text-[#181818] tracking-[-0.02em] mb-4">
            100% Free & Open-Source
          </h2>
          <p className="text-[17px] font-normal leading-[1.6] text-[#5A564D]">
            Deploy on your local counter PC, a private cloud VPS, or Docker. Zero commissions, zero subscriptions, complete data sovereignty.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="max-w-[960px] mx-auto bg-[#FFFFFF] border border-[#E6E1D6] rounded-[24px] p-8 sm:p-12 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Left: Price & CTA (6 cols) */}
            <div className="lg:col-span-6">
              <h3 className="text-[26px] sm:text-[28px] font-normal text-[#181818] mb-3">
                Full Restaurant Edition
              </h3>
              <p className="text-[15px] text-[#5A564D] mb-8 leading-relaxed">
                Everything required to run dine-in ordering, counter billing, multi-station KDS, and tableside QR ordering.
              </p>

              <div className="mb-8 p-6 rounded-[16px] bg-[#F4F1EA] border border-[#E6E1D6]">
                <div className="flex items-baseline gap-2">
                  <span className="text-[42px] sm:text-[48px] font-medium text-[#181818] tracking-[-0.03em] leading-none">
                    ₹0 / Free
                  </span>
                  <span className="text-[16px] font-normal text-[#5A564D]">
                    forever
                  </span>
                </div>
                <p className="text-[14px] font-normal text-[#5A564D] mt-2">
                  Released under the permissive MIT License • Deploy anywhere
                </p>
              </div>

              <Link
                href="/onboarding"
                className="btn-ink w-full text-center justify-center text-[15px] py-3.5"
              >
                Launch Your Restaurant (Free Setup) →
              </Link>
            </div>

            {/* Right: Deliverables List (6 cols) */}
            <div className="lg:col-span-6 border-t lg:border-t-0 lg:border-l border-[#E6E1D6] pt-8 lg:pt-0 lg:pl-10">
              <div className="text-[14px] font-medium text-[#181818] mb-5">
                Included in standard release:
              </div>

              <ul className="space-y-3.5 text-[15px] text-[#5A564D]">
                <li className="flex items-start gap-3">
                  <span className="text-[#181818] font-bold mt-0.5">✓</span>
                  <span>Unlimited tables with instant QR mobile dining</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#181818] font-bold mt-0.5">✓</span>
                  <span>Kitchen Display Screen (KDS) with real-time WebSockets</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#181818] font-bold mt-0.5">✓</span>
                  <span>Counter POS terminal with fast KOT printing</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#181818] font-bold mt-0.5">✓</span>
                  <span>Waiter mobile tableside ordering app</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#181818] font-bold mt-0.5">✓</span>
                  <span>0% Per-order commission or transaction cut</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#181818] font-bold mt-0.5">✓</span>
                  <span>Runs offline on local network or public VPS with Docker</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
