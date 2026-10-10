'use client';

import React, { useState } from 'react';

interface PricingSectionProps {
  onOpenGetStarted: () => void;
}

export function PricingSection({ onOpenGetStarted }: PricingSectionProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  return (
    <section id="pricing" className="py-24 bg-[#ffffff] border-b border-[#dddddd]">
      <div className="max-w-6xl mx-auto px-6">
        {/* Pricing Header in Inter Display Commercial Dialect */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[12px] uppercase tracking-wider font-semibold text-[#181d26]/70 mb-2 block">
            Simple, Transparent Pricing
          </span>
          <h2 className="text-[36px] sm:text-[44px] font-[475] text-[#181d26] leading-[1.15] mb-4">
            One flat rate. Complete operational ownership.
          </h2>
          <p className="text-[16px] text-[#333840] leading-relaxed max-w-2xl mx-auto">
            No per-terminal licensing, no per-order commissions, and no surprise add-on fees. You receive a fully isolated cloud instance and unlimited local POS terminals.
          </p>

          {/* Billing Switcher (Pill style) */}
          <div className="inline-flex items-center bg-[#f8fafc] p-1 rounded-full border border-[#dddddd] mt-8">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-5 py-2 rounded-full text-[14px] font-[475] transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-[#181d26] text-[#ffffff] shadow-xs'
                  : 'text-[#333840] hover:text-[#181d26]'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-5 py-2 rounded-full text-[14px] font-[475] transition-all ${
                billingCycle === 'annual'
                  ? 'bg-[#181d26] text-[#ffffff] shadow-xs'
                  : 'text-[#333840] hover:text-[#181d26]'
              }`}
            >
              Annual Billing (Save 17%)
            </button>
          </div>
        </div>

        {/* Featured Commercial Tier Card */}
        <div className="max-w-4xl mx-auto border border-[#dddddd] rounded-[16px] bg-[#f8fafc] p-8 sm:p-12 shadow-xs mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Plan Info & Pricing (6 cols) */}
            <div className="lg:col-span-6">
              <span className="text-[12px] font-medium bg-[#ffffff] border border-[#dddddd] px-3 py-1 rounded-full text-[#181d26] inline-block mb-3">
                Dedicated Restaurant Instance
              </span>
              <h3 className="text-[26px] font-[475] text-[#181d26] mb-2">
                RestroDash All-Inclusive
              </h3>
              <p className="text-[14px] text-[#333840] mb-6 leading-relaxed">
                Everything required to run high-volume dine-in, takeaway, multi-station KDS, and tableside QR ordering for your restaurant.
              </p>

              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-[44px] font-[575] text-[#181d26] tracking-tight">
                    {billingCycle === 'monthly' ? '₹35,000' : '₹29,166'}
                  </span>
                  <span className="text-[15px] text-[#41454d]">/ month</span>
                </div>
                <span className="text-[13px] text-[#41454d] block mt-1">
                  {billingCycle === 'annual'
                    ? 'Billed annually at ₹3,50,000 / year (2 months free)'
                    : 'Billed monthly • Cancel anytime'}
                </span>
              </div>

              <button
                onClick={onOpenGetStarted}
                className="btn-pricing-pill w-full sm:w-auto text-center justify-center text-[15px] py-3.5 px-8"
              >
                Deploy Restaurant Instance
              </button>
            </div>

            {/* Checklist (6 cols) */}
            <div className="lg:col-span-6 bg-[#ffffff] border border-[#dddddd] rounded-[12px] p-6">
              <div className="text-[13px] font-[575] text-[#181d26] uppercase tracking-wider mb-4">
                What&apos;s Included:
              </div>
              <ul className="space-y-3 text-[14px] text-[#333840]">
                <li className="flex items-start gap-3">
                  <span className="text-[#006400] font-medium">✓</span>
                  <span><strong>Dedicated Isolated VPS</strong> with custom domain</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#006400] font-medium">✓</span>
                  <span><strong>100% Offline Local POS</strong> on counter hardware</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#006400] font-medium">✓</span>
                  <span><strong>Host-Peer QR Dining</strong> with 4-digit PIN security</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#006400] font-medium">✓</span>
                  <span><strong>Multi-Station KDS screens</strong> on Port 3002</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#006400] font-medium">✓</span>
                  <span><strong>Direct ESC/POS printing</strong> (USB/Ethernet)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#006400] font-medium">✓</span>
                  <span><strong>Unlimited terminals</strong> & unlimited staff accounts</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#006400] font-medium">✓</span>
                  <span><strong>Automated daily backups</strong> to cloud storage</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#006400] font-medium">✓</span>
                  <span><strong>Zero commission</strong> per order or transaction</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Detailed Specification Table */}
        <div className="max-w-4xl mx-auto">
          <div className="text-[18px] font-[475] text-[#181d26] mb-4">
            Technical Specification Matrix
          </div>
          <div className="border border-[#dddddd] rounded-[12px] overflow-hidden bg-[#ffffff]">
            <table className="w-full text-left text-[14px] border-collapse">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-[#dddddd] text-[#181d26] font-medium">
                  <th className="py-3.5 px-5">Capability</th>
                  <th className="py-3.5 px-5">RestroDash Dedicated Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dddddd] text-[#333840]">
                <tr>
                  <td className="py-3.5 px-5 font-medium text-[#181d26]">Tenant Isolation</td>
                  <td className="py-3.5 px-5">Dedicated instance & isolated SQLite database</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-5 font-medium text-[#181d26]">Offline Mode</td>
                  <td className="py-3.5 px-5">Fully autonomous; no internet required for orders/billing</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-5 font-medium text-[#181d26]">QR Ordering Architecture</td>
                  <td className="py-3.5 px-5">Host Master + 4-digit guest PIN session collaboration</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-5 font-medium text-[#181d26]">Kitchen Display (KDS)</td>
                  <td className="py-3.5 px-5">Standalone WebSocket server on Port 3002 with station bump</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-5 font-medium text-[#181d26]">Thermal Printing</td>
                  <td className="py-3.5 px-5">Raw ESC/POS byte streaming verified with golden column oracles</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-5 font-medium text-[#181d26]">Order Ownership Invariant</td>
                  <td className="py-3.5 px-5">Open visibility for all authorized staff with full audit trail</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-5 font-medium text-[#181d26]">Support & Onboarding</td>
                  <td className="py-3.5 px-5">24/7 dedicated engineering support & 1-on-1 launch call</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
