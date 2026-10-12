'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { copy } from '@/content/copy';

export function OrderStepsSection() {
  const [activeStep, setActiveStep] = useState(0);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      setActiveStep((index + 1) % copy.steps.items.length);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setActiveStep((index - 1 + copy.steps.items.length) % copy.steps.items.length);
    }
  };

  return (
    <section id="how" className="py-24 sm:py-32 bg-[#181818] text-[#FFFFFF] scroll-mt-[88px]">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Heading + Interactive 4-step list (cols 1 to 5) */}
          <div className="lg:col-span-5">
            <h2 className="text-[32px] sm:text-[44px] lg:text-[48px] font-normal leading-[1.15] text-[#FFFFFF] tracking-[-0.02em] mb-10 sm:mb-14">
              {copy.steps.h2}
            </h2>

            {/* Desktop Vertical Tab List */}
            <div className="hidden md:flex flex-col gap-6" role="tablist" aria-label="Order flow steps">
              {copy.steps.items.map((item, idx) => {
                const isActive = activeStep === idx;
                return (
                  <button
                    key={item.step}
                    role="tab"
                    id={`step-tab-${idx}`}
                    aria-selected={isActive}
                    aria-controls={`step-panel-${idx}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => setActiveStep(idx)}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                    className={`text-left pl-6 relative transition-all duration-200 focus:outline-hidden ${
                      isActive ? 'text-[#FFFFFF]' : 'text-[#B5B0A6] hover:text-[#FFFFFF]'
                    }`}
                  >
                    {/* 4px Amber bar for active step, repeating logo bar motif */}
                    <span
                      className={`absolute left-0 top-0 bottom-0 w-[4px] rounded-full transition-all duration-200 ${
                        isActive ? 'bg-[#FFFFFF]' : 'bg-transparent'
                      }`}
                    />

                    <div className="text-[13px] font-mono opacity-60 mb-1">
                      0{item.step}
                    </div>
                    <div className="text-[20px] sm:text-[22px] font-medium leading-[1.3] mb-1.5">
                      {item.title}
                    </div>
                    {isActive && (
                      <p className="text-[15px] sm:text-[16px] leading-[1.5] text-[#B5B0A6] mt-1 max-w-[380px]">
                        {item.description}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Mobile Stacked Step Layout (below 768px) */}
            <div className="md:hidden flex flex-col gap-10">
              {copy.steps.items.map((item) => (
                <div key={item.step} className="border-l-2 border-[#FFFFFF] pl-4">
                  <div className="text-[12px] font-mono opacity-60 mb-1">
                    0{item.step}
                  </div>
                  <div className="text-[20px] font-medium leading-[1.3] text-[#FFFFFF] mb-2">
                    {item.title}
                  </div>
                  <p className="text-[15px] leading-[1.5] text-[#B5B0A6] mb-4">
                    {item.description}
                  </p>
                  <div className="relative aspect-[3/2] rounded-[16px] overflow-hidden bg-[#222222]">
                    <Image
                      src={item.image}
                      alt={item.imageAlt}
                      fill
                      sizes="100vw"
                      className="object-cover"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: 3:2 Photo with 24px radius (cols 7 to 12) on desktop */}
          <div className="hidden md:block lg:col-span-7">
            <div className="relative aspect-[3/2] rounded-[24px] overflow-hidden bg-[#222222] border border-[#2A2A2A]">
              {copy.steps.items.map((item, idx) => (
                <div
                  key={item.step}
                  role="tabpanel"
                  id={`step-panel-${idx}`}
                  aria-labelledby={`step-tab-${idx}`}
                  hidden={activeStep !== idx}
                  className={`absolute inset-0 transition-opacity duration-300 ${
                    activeStep === idx ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  <Image
                    src={item.image}
                    alt={item.imageAlt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 680px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
