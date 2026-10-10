'use client';

import React from 'react';

interface SignatureCoralBandProps {
  onOpenGetStarted: () => void;
}

export function SignatureCoralBand({ onOpenGetStarted }: SignatureCoralBandProps) {
  return (
    <section id="architecture" className="py-24 bg-[#ffffff]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="bg-[#aa2d00] text-[#ffffff] rounded-[16px] p-8 sm:p-14 md:p-16 relative overflow-hidden">
          {/* Header */}
          <div className="max-w-3xl mb-12">
            <h2 className="text-[32px] sm:text-[40px] font-normal text-[#ffffff] leading-[1.15] mb-6">
              Production speed. 100% offline continuity.
            </h2>
            <p className="text-[16px] sm:text-[18px] text-[#ffffff]/90 leading-[1.6]">
              Cloud-only POS systems grind to a halt the moment internet connectivity stutters. RestroDash runs authoritative SQLite engines directly on local counter hardware — ensuring table management, split billing, and kitchen routing stay active 24/7 without internet reliance.
            </p>
          </div>

          {/* 3 Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 pt-8 border-t border-[#ffffff]/20">
            <div>
              <div className="text-[18px] font-medium text-[#ffffff] mb-2">
                Local SQLite WAL Engine
              </div>
              <p className="text-[14px] text-[#ffffff]/80 leading-relaxed">
                Zero network roundtrips for table changes, split checks, and inventory deductions. Orders commit in sub-millisecond local transactions on Port 3001.
              </p>
            </div>

            <div>
              <div className="text-[18px] font-medium text-[#ffffff] mb-2">
                LAN Server App (:3003)
              </div>
              <p className="text-[14px] text-[#ffffff]/80 leading-relaxed">
                Customers scan QR codes and connect straight to the local restaurant node over LAN or cloud fallback. No external internet speed bottlenecks.
              </p>
            </div>

            <div>
              <div className="text-[18px] font-medium text-[#ffffff] mb-2">
                Direct ESC/POS Driver
              </div>
              <p className="text-[14px] text-[#ffffff]/80 leading-relaxed">
                Print kitchen KOTs and guest bills with golden column alignment directly to USB, Serial, and Network thermal printers with raw binary performance.
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={onOpenGetStarted}
              className="btn-secondary-on-dark"
            >
              Explore Dedicated Setup
            </button>
            <span className="text-[13px] text-[#ffffff]/80">
              Single flat rate • ₹35,000 / month all-inclusive
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
