'use client';

import React from 'react';

interface LightCtaBannerProps {
  onOpenGetStarted: () => void;
}

export function LightCtaBanner({ onOpenGetStarted }: LightCtaBannerProps) {
  return (
    <section className="py-16 bg-[#ffffff]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="bg-[#e0e2e6] rounded-[16px] p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-[24px] sm:text-[28px] font-normal text-[#181d26] mb-2">
              Start building your dining experience with RestroDash.
            </h3>
            <p className="text-[14px] sm:text-[15px] text-[#333840]">
              Get your dedicated restaurant subdomain and live POS system configured in less than 10 minutes.
            </p>
          </div>

          <div className="flex-shrink-0">
            <button
              onClick={onOpenGetStarted}
              className="btn-primary py-3.5 px-6"
            >
              Get Started Now
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
