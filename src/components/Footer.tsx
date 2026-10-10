'use client';

import React from 'react';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="bg-[#ffffff] pt-16 pb-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b border-[#dddddd]">
          {/* Brand Col */}
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-[8px] bg-[#181d26] flex items-center justify-center p-1.5">
                <Image 
                  src="/restro-logo.png" 
                  alt="RestroDash Logo" 
                  width={24} 
                  height={24} 
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-medium text-[#181d26] text-[16px]">
                RestroDash
              </span>
            </div>
            <p className="text-[13px] text-[#41454d] max-w-sm leading-relaxed mb-4">
              The high-performance, offline-first restaurant POS and dining operating system. Local SQLite execution with dedicated cloud tenant isolation.
            </p>
            <div className="text-[12px] text-[#006400] flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-[#006400]" />
              <span>All Systems Operational • Standalone Engine</span>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <div className="text-[13px] font-medium text-[#181d26] uppercase tracking-wider mb-3">
              Product
            </div>
            <ul className="space-y-2.5 text-[14px] text-[#41454d]">
              <li><a href="#architecture" className="hover:text-[#181d26]">POS Engine</a></li>
              <li><a href="#qr-dining" className="hover:text-[#181d26]">Host-Peer QR</a></li>
              <li><a href="#kds" className="hover:text-[#181d26]">Kitchen KDS (:3002)</a></li>
              <li><a href="#architecture" className="hover:text-[#181d26]">Thermal ESC/POS</a></li>
              <li><a href="#pricing" className="hover:text-[#181d26]">Pricing (₹35,000)</a></li>
            </ul>
          </div>

          {/* Architecture Links */}
          <div>
            <div className="text-[13px] font-medium text-[#181d26] uppercase tracking-wider mb-3">
              Architecture
            </div>
            <ul className="space-y-2.5 text-[14px] text-[#41454d]">
              <li><a href="#architecture" className="hover:text-[#181d26]">SQLite WAL Mode</a></li>
              <li><a href="#architecture" className="hover:text-[#181d26]">Local LAN Server (:3003)</a></li>
              <li><a href="#architecture" className="hover:text-[#181d26]">Dedicated VPS Isolation</a></li>
              <li><a href="#architecture" className="hover:text-[#181d26]">Zero-Downtime Guarantee</a></li>
              <li><a href="#faq" className="hover:text-[#181d26]">Hardware Allowlist</a></li>
            </ul>
          </div>

          {/* Company & Support */}
          <div>
            <div className="text-[13px] font-medium text-[#181d26] uppercase tracking-wider mb-3">
              Support
            </div>
            <ul className="space-y-2.5 text-[14px] text-[#41454d]">
              <li><a href="#faq" className="hover:text-[#181d26]">Documentation</a></li>
              <li><a href="#faq" className="hover:text-[#181d26]">API Reference</a></li>
              <li><a href="#pricing" className="hover:text-[#181d26]">Dedicated Onboarding</a></li>
              <li><a href="#faq" className="hover:text-[#181d26]">WhatsApp Support</a></li>
              <li><a href="#faq" className="hover:text-[#181d26]">Status Page</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-[#41454d]">
          <div>
            © {new Date().getFullYear()} RestroDash Technologies Inc. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <a href="#faq" className="hover:text-[#181d26]">Privacy Policy</a>
            <a href="#faq" className="hover:text-[#181d26]">Terms of Service</a>
            <a href="#faq" className="hover:text-[#181d26]">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
