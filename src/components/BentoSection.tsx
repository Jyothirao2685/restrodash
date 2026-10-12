import React from 'react';
import { copy } from '@/content/copy';

export function BentoSection() {
  return (
    <section className="py-24 sm:py-32 bg-[#F4F1EA] text-[#181818]">
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Centered H2 */}
        <div className="text-center max-w-[760px] mx-auto mb-16 sm:mb-20">
          <h2 className="text-[32px] sm:text-[44px] lg:text-[48px] font-normal leading-[1.15] text-[#181818] tracking-[-0.02em]">
            {copy.bento.h2}
          </h2>
        </div>

        {/* 4 Cards Bento Grid (Diagonal alternating Ink & White) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Card 1: Guests install nothing (Span 8, White) */}
          <div className="lg:col-span-8 bg-[#FFFFFF] text-[#181818] border border-[#E6E1D6] rounded-[24px] p-8 sm:p-10 min-h-[320px] flex flex-col justify-between">
            <div className="max-w-md">
              <h3 className="text-[24px] sm:text-[28px] font-normal leading-[1.25] text-[#181818] mb-3">
                {copy.bento.items[0].title}
              </h3>
              <p className="text-[16px] sm:text-[17px] font-normal leading-[1.6] text-[#5A564D]">
                {copy.bento.items[0].description}
              </p>
            </div>

            {/* Flat line illustration (2px ink stroke, square caps) */}
            <div className="self-end mt-6 sm:mt-0" aria-hidden="true">
              <svg width="120" height="80" viewBox="0 0 120 80" fill="none" stroke="#181818" strokeWidth="2" strokeLinecap="square">
                <rect x="10" y="10" width="40" height="50" rx="4" />
                <rect x="20" y="22" width="20" height="20" />
                <path d="M26 32h8M30 28v8" />
                <path d="M70 20h35M70 35h25M70 50h40" />
              </svg>
            </div>
          </div>

          {/* Card 2: One list of orders (Span 4, Ink) */}
          <div className="lg:col-span-4 bg-[#181818] text-[#FFFFFF] rounded-[24px] p-8 sm:p-10 min-h-[320px] flex flex-col justify-between">
            <div>
              <h3 className="text-[24px] sm:text-[28px] font-normal leading-[1.25] text-[#FFFFFF] mb-3">
                {copy.bento.items[1].title}
              </h3>
              <p className="text-[16px] sm:text-[17px] font-normal leading-[1.6] text-[#B5B0A6]">
                {copy.bento.items[1].description}
              </p>
            </div>

            {/* Flat line illustration (paper lines with amber detail) */}
            <div className="self-end mt-6 sm:mt-0" aria-hidden="true">
              <svg width="100" height="80" viewBox="0 0 100 80" fill="none" stroke="#FBFAF7" strokeWidth="2" strokeLinecap="square">
                <rect x="15" y="12" width="60" height="16" />
                <rect x="15" y="32" width="60" height="16" />
                <rect x="15" y="52" width="60" height="16" />
                <circle cx="85" cy="20" r="3" fill="#FFFFFF" stroke="none" />
                <circle cx="85" cy="40" r="3" fill="#FFFFFF" stroke="none" />
                <circle cx="85" cy="60" r="3" fill="#FFFFFF" stroke="none" />
              </svg>
            </div>
          </div>

          {/* Card 3: Edit the menu once (Span 4, Ink) */}
          <div className="lg:col-span-4 bg-[#181818] text-[#FFFFFF] rounded-[24px] p-8 sm:p-10 min-h-[320px] flex flex-col justify-between">
            <div>
              <h3 className="text-[24px] sm:text-[28px] font-normal leading-[1.25] text-[#FFFFFF] mb-3">
                {copy.bento.items[2].title}
              </h3>
              <p className="text-[16px] sm:text-[17px] font-normal leading-[1.6] text-[#B5B0A6]">
                {copy.bento.items[2].description}
              </p>
            </div>

            {/* Flat line illustration (paper lines with amber detail) */}
            <div className="self-end mt-6 sm:mt-0" aria-hidden="true">
              <svg width="100" height="80" viewBox="0 0 100 80" fill="none" stroke="#FBFAF7" strokeWidth="2" strokeLinecap="square">
                <circle cx="50" cy="40" r="14" stroke="#FFFFFF" />
                <path d="M50 15v11M50 54v11M25 40h11M64 40h11" />
                <circle cx="50" cy="12" r="3" fill="#FBFAF7" stroke="none" />
                <circle cx="50" cy="68" r="3" fill="#FBFAF7" stroke="none" />
                <circle cx="22" cy="40" r="3" fill="#FBFAF7" stroke="none" />
                <circle cx="78" cy="40" r="3" fill="#FBFAF7" stroke="none" />
              </svg>
            </div>
          </div>

          {/* Card 4: A person to call (Span 8, White) */}
          <div className="lg:col-span-8 bg-[#FFFFFF] text-[#181818] border border-[#E6E1D6] rounded-[24px] p-8 sm:p-10 min-h-[320px] flex flex-col justify-between">
            <div className="max-w-md">
              <h3 className="text-[24px] sm:text-[28px] font-normal leading-[1.25] text-[#181818] mb-3">
                {copy.bento.items[3].title}
              </h3>
              <p className="text-[16px] sm:text-[17px] font-normal leading-[1.6] text-[#5A564D]">
                {copy.bento.items[3].description}
              </p>
            </div>

            {/* Flat line illustration (2px ink stroke, square caps) */}
            <div className="self-end mt-6 sm:mt-0" aria-hidden="true">
              <svg width="120" height="80" viewBox="0 0 120 80" fill="none" stroke="#181818" strokeWidth="2" strokeLinecap="square">
                <path d="M30 45a16 16 0 0 1 16-16h28a16 16 0 0 1 16 16v8a6 6 0 0 1-6 6H36a6 6 0 0 1-6-6v-8z" />
                <path d="M26 48v8M94 48v8" />
                <path d="M46 60v6h28v-6" />
                <path d="M60 20v6" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
