import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { copy } from '@/content/copy';

export function Footer() {
  return (
    <footer className="relative bg-[#121212] text-[#FFFFFF] pt-44 pb-12 overflow-hidden">
      {/* Faint QR-dot pattern in footer at 4% white */}
      <div
        className="absolute inset-0 bg-qr-dots opacity-40 pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-[1200px] mx-auto px-6">
        {/* Row 1: Logo, Contact info, Navigation links */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 items-start">
          {/* Logo & Description (cols 1 to 5) */}
          <div className="md:col-span-5">
            <Link href="/" className="inline-block mb-4">
              <div className="h-[28px] flex items-center">
                <Image
                  src="/restro-logo.png"
                  alt="RestroDash"
                  width={112}
                  height={28}
                  className="h-[28px] w-auto object-contain filter brightness-0 invert"
                />
              </div>
            </Link>
            <p className="text-[14px] leading-[1.6] text-[#B5B0A6] max-w-sm">
              {copy.footer.description}
            </p>
          </div>

          {/* Contact Details (cols 6 to 8) */}
          <div className="md:col-span-4">
            <div className="text-[13px] font-mono text-[#B5B0A6] mb-3">
              CONTACT
            </div>
            <div className="space-y-2 text-[15px] text-[#FFFFFF]">
              <div>
                <a href={`tel:${copy.footer.phone.replace(/\s+/g, '')}`} className="hover:text-[#E5A823] transition-colors">
                  {copy.footer.phone}
                </a>
              </div>
              <div>
                <a href={`mailto:${copy.footer.email}`} className="hover:text-[#E5A823] transition-colors">
                  {copy.footer.email}
                </a>
              </div>
            </div>
          </div>

          {/* Quick Links (cols 9 to 12) */}
          <div className="md:col-span-3">
            <div className="text-[13px] font-mono text-[#B5B0A6] mb-3">
              NAVIGATE
            </div>
            <ul className="space-y-2 text-[14px] text-[#B5B0A6]">
              {copy.footer.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="hover:text-[#FFFFFF] transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 4px Amber Rule (echoing the logo bar decoration) */}
        <div className="w-full h-[4px] bg-[#E5A823] mb-8" aria-hidden="true" />

        {/* Row 2: Legal and Copyright */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[13px] text-[#B5B0A6]">
          <div>
            {copy.footer.legal}
          </div>
          <div className="flex items-center gap-6">
            <a href="#faq" className="hover:text-[#FFFFFF] transition-colors">
              Privacy Policy
            </a>
            <a href="#faq" className="hover:text-[#FFFFFF] transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
