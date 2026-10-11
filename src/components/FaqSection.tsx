import React from 'react';
import { copy } from '@/content/copy';

export function FaqSection() {
  return (
    <section id="faq" className="py-24 sm:py-32 bg-[#FBFAF7] text-[#181818] scroll-mt-[88px]">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Left Column (cols 1 to 4): Heading and Subtext */}
          <div className="lg:col-span-4">
            <h2 className="text-[32px] sm:text-[44px] lg:text-[48px] font-normal leading-[1.15] text-[#181818] tracking-[-0.02em] mb-4">
              {copy.faq.h2}
            </h2>
            <p className="text-[17px] font-normal leading-[1.6] text-[#5A564D] max-w-sm">
              {copy.faq.sub}
            </p>
          </div>

          {/* Right Column (cols 5 to 12): 8 Native Details Accordion Rows */}
          <div className="lg:col-span-8 divide-y divide-[#E6E1D6] border-t border-b border-[#E6E1D6]">
            {copy.faq.items.map((item, index) => (
              <details
                key={index}
                name="restrodash-faq"
                className="group py-6 transition-colors duration-150"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none text-[19px] sm:text-[20px] font-medium leading-[1.3] text-[#181818] hover:text-[#5A564D] focus:outline-hidden">
                  <span className="pr-6">{item.q}</span>
                  <span
                    className="text-[22px] font-normal text-[#8A857B] transition-transform duration-200 group-open:rotate-45 flex-shrink-0"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>

                <div className="mt-4 text-[16px] sm:text-[17px] font-normal leading-[1.6] text-[#5A564D] max-w-[62ch] pr-6">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
