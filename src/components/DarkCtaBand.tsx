'use client';

import React from 'react';

interface DarkCtaBandProps {
  onOpenGetStarted: () => void;
}

export function DarkCtaBand({ onOpenGetStarted }: DarkCtaBandProps) {
  return (
    <section className="py-24 bg-[#ffffff]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="bg-[#181d26] text-[#ffffff] rounded-[16px] p-8 sm:p-14 md:p-16 relative overflow-hidden">
          <div className="max-w-3xl">
            <span className="text-[12px] uppercase tracking-wider font-semibold text-[#ffffff]/70 mb-2 block">
              Modernize Your Floor
            </span>
            <h2 className="text-[32px] sm:text-[40px] font-normal text-[#ffffff] leading-[1.15] mb-6">
              Transform your restaurant operations in minutes.
            </h2>
            <p className="text-[16px] sm:text-[18px] text-[#ffffff]/80 leading-[1.6] mb-8">
              Join leading restaurants operating with zero-downtime reliability, lightning-fast group QR dining, and unified kitchen orchestration.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={onOpenGetStarted}
                className="btn-secondary-on-dark"
              >
                Launch Your Restaurant Instance
              </button>
              <a
                href="#pricing"
                className="inline-flex items-center justify-center text-[16px] font-medium px-6 py-3.5 rounded-[12px] text-[#ffffff] border border-[#dddddd]/30 hover:bg-[#ffffff]/10 transition-colors"
              >
                Review ₹35,000 / mo Plan
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
