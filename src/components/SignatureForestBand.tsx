'use client';

import React from 'react';

interface SignatureForestBandProps {
  onOpenGetStarted: () => void;
}

export function SignatureForestBand({ onOpenGetStarted }: SignatureForestBandProps) {
  return (
    <section id="kds" className="py-24 bg-[#ffffff]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="bg-[#0a2e0e] text-[#ffffff] rounded-[16px] p-8 sm:p-14 md:p-16 relative overflow-hidden">
          {/* Header */}
          <div className="max-w-3xl mb-12">
            <h2 className="text-[32px] sm:text-[40px] font-normal text-[#ffffff] leading-[1.15] mb-6">
              Autonomous floor operations. Built for rush hour.
            </h2>
            <p className="text-[16px] sm:text-[18px] text-[#ffffff]/90 leading-[1.6]">
              When the restaurant gets packed on Saturday evening, latency kills profitability. RestroDash coordinates every touchpoint — cashier terminals, kitchen screens, tableside phones, and thermal receipt printers — over local high-speed LAN.
            </p>
          </div>

          {/* 3 Technical Grid Points */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 pt-8 border-t border-[#ffffff]/20">
            <div>
              <div className="text-[18px] font-medium text-[#ffffff] mb-2">
                Multi-Terminal Cashier Sync
              </div>
              <p className="text-[14px] text-[#ffffff]/80 leading-relaxed">
                Operate multiple POS counters simultaneously. Table state locks and live order additions synchronize across devices in sub-milliseconds.
              </p>
            </div>

            <div>
              <div className="text-[18px] font-medium text-[#ffffff] mb-2">
                Golden Thermal Precision
              </div>
              <p className="text-[14px] text-[#ffffff]/80 leading-relaxed">
                Raw byte-level ESC/POS streaming tested against strict golden receipt oracles. Perfect column alignment on 58mm and 80mm paper widths.
              </p>
            </div>

            <div>
              <div className="text-[18px] font-medium text-[#ffffff] mb-2">
                Audited Shift Closures
              </div>
              <p className="text-[14px] text-[#ffffff]/80 leading-relaxed">
                Cash drawer balancing, payment split reconciliations, and instant Z-reports are generated locally and synced to your dedicated cloud dashboard.
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={onOpenGetStarted}
              className="btn-secondary-on-dark"
            >
              Get Started with RestroDash
            </button>
            <span className="text-[13px] text-[#ffffff]/80">
              Complete setup in 10 minutes • Dedicated VPS instance
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
