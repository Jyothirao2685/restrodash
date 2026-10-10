'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface NavbarProps {
  onOpenGetStarted: () => void;
}

export function Navbar({ onOpenGetStarted }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#ffffff] border-b border-[#dddddd] transition-all">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-8">
          <a href="#" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-[8px] bg-[#181d26] flex items-center justify-center p-1.5 shadow-xs">
              <Image 
                src="/restro-logo.png" 
                alt="RestroDash Logo" 
                width={24} 
                height={24} 
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-[#181d26] text-[16px] leading-tight tracking-tight">
                RestroDash
              </span>
              <span className="text-[11px] text-[#41454d] tracking-normal font-normal">
                Restaurant POS & Dining OS
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-[14px] text-[#333840]">
            <a href="#architecture" className="hover:text-[#181d26] transition-colors">
              Architecture
            </a>
            <a href="#qr-dining" className="hover:text-[#181d26] transition-colors">
              QR Dining
            </a>
            <a href="#kds" className="hover:text-[#181d26] transition-colors">
              Kitchen KDS
            </a>
            <a href="#pricing" className="hover:text-[#181d26] transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-[#181d26] transition-colors">
              FAQ
            </a>
          </nav>
        </div>

        {/* CTA Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <a
            href="#pricing"
            className="text-[14px] font-medium text-[#333840] hover:text-[#181d26] px-3 py-2 transition-colors"
          >
            ₹35,000 / mo
          </a>
          <button
            onClick={onOpenGetStarted}
            className="btn-primary text-[14px] py-2.5 px-4"
          >
            Start Free Trial
          </button>
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-[#333840] hover:text-[#181d26]"
          aria-label="Toggle Navigation Menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#ffffff] border-b border-[#dddddd] px-6 py-4 flex flex-col gap-3 text-[14px]">
          <a
            href="#architecture"
            onClick={() => setMobileMenuOpen(false)}
            className="text-[#333840] hover:text-[#181d26] py-1"
          >
            Architecture
          </a>
          <a
            href="#qr-dining"
            onClick={() => setMobileMenuOpen(false)}
            className="text-[#333840] hover:text-[#181d26] py-1"
          >
            QR Dining
          </a>
          <a
            href="#kds"
            onClick={() => setMobileMenuOpen(false)}
            className="text-[#333840] hover:text-[#181d26] py-1"
          >
            Kitchen KDS
          </a>
          <a
            href="#pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="text-[#333840] hover:text-[#181d26] py-1"
          >
            Pricing
          </a>
          <a
            href="#faq"
            onClick={() => setMobileMenuOpen(false)}
            className="text-[#333840] hover:text-[#181d26] py-1"
          >
            FAQ
          </a>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenGetStarted();
            }}
            className="btn-primary text-[14px] py-2.5 mt-2 w-full text-center justify-center"
          >
            Start Free Trial
          </button>
        </div>
      )}
    </header>
  );
}
