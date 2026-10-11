import React from 'react';
import Image from 'next/image';
import { copy } from '@/content/copy';

export function ModulesSection() {
  return (
    <section id="modules" className="py-24 sm:py-32 bg-[#FBFAF7] text-[#181818] scroll-mt-[88px]">
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Centered H2 */}
        <div className="text-center max-w-[760px] mx-auto mb-16 sm:mb-20">
          <h2 className="text-[32px] sm:text-[44px] lg:text-[48px] font-normal leading-[1.15] text-[#181818] tracking-[-0.02em]">
            {copy.modules.h2}
          </h2>
        </div>

        {/* 2-Column Grid (1000px max, 24px gap) */}
        <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {copy.modules.items.map((item) => (
            <div
              key={item.id}
              className="bg-[#FFFFFF] rounded-[20px] border border-[#E6E1D6] overflow-hidden flex flex-col justify-between group transition-shadow duration-300"
            >
              {/* Card Header (32px padding) */}
              <div className="p-8">
                <h3 className="text-[24px] sm:text-[28px] font-normal leading-[1.25] text-[#181818] mb-3">
                  {item.title}
                </h3>
                <p className="text-[16px] sm:text-[17px] font-normal leading-[1.6] text-[#5A564D] max-w-[420px]">
                  {item.description}
                </p>
              </div>

              {/* 4:3 Photo Flush to Bottom */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F4F1EA]">
                <Image
                  src={item.image}
                  alt={item.imageAlt}
                  fill
                  sizes="(max-width: 768px) 100vw, 480px"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
