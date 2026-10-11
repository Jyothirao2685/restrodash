'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { copy } from '@/content/copy';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  return (
    <>
      {/* Skip to Content */}
      <a
        href="#modules"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 bg-[#E5A823] text-[#181818] px-4 py-2 rounded-[8px] font-medium"
      >
        Skip to content
      </a>

      <header
        className={`sticky top-0 z-40 h-[72px] bg-[#181818] transition-colors ${
          scrolled ? 'border-b border-[#2A2A2A]' : 'border-b border-transparent'
        }`}
      >
        <div className="max-w-[1200px] mx-auto px-6 h-full flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="h-[28px] flex items-center">
              <Image
                src="/restro-logo.png"
                alt="RestroDash"
                width={112}
                height={28}
                priority
                className="h-[28px] w-auto object-contain filter brightness-0 invert"
              />
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-9 text-[15px] font-normal text-[#FFFFFF]" aria-label="Main Navigation">
            {copy.header.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="relative py-2 text-[#FFFFFF] hover:text-[#FFFFFF] transition-colors group"
              >
                {link.label}
                <span className="absolute bottom-0 left-0 w-0 h-[3px] bg-[#E5A823] transition-all duration-200 group-hover:w-full" />
              </a>
            ))}
          </nav>

          {/* Desktop CTA Button */}
          <div className="hidden sm:flex items-center">
            <Link href="/onboarding" className="btn-white text-[14px] py-2.5 px-5">
              {copy.header.cta}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex sm:hidden items-center gap-3">
            <Link href="/onboarding" className="btn-white text-[13px] py-2 px-3.5">
              {copy.header.cta}
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#FFFFFF] focus:outline-hidden"
              aria-label="Toggle Navigation Menu"
              aria-expanded={mobileMenuOpen}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Full-screen Mobile Menu */}
        {mobileMenuOpen && (
          <div
            className="md:hidden fixed inset-x-0 top-[72px] bottom-0 bg-[#181818] p-8 flex flex-col justify-between z-50 border-t border-[#2A2A2A]"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Menu"
          >
            <nav className="flex flex-col gap-6 text-[20px] font-medium text-[#FFFFFF]">
              {copy.header.links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 border-b border-[#2A2A2A]"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="pt-6">
              <Link
                href="/onboarding"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-white w-full text-center text-[16px] py-3.5"
              >
                {copy.header.cta}
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
