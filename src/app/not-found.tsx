import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#ffffff] text-[#222222] flex flex-col justify-between selection:bg-[#222222] selection:text-[#ffffff]">
      {/* Top Header */}
      <header className="border-b border-[#e5e5e5] py-4 px-6 bg-[#ffffff]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-[3px] bg-[#222222] flex items-center justify-center p-1">
              <Image
                src="/restro-logo.png"
                alt="RestroDash Logo"
                width={20}
                height={20}
                className="w-full h-full object-contain filter invert"
              />
            </div>
            <span className="font-semibold text-[#222222] text-[16px] tracking-tight">
              RestroDash
            </span>
          </Link>
          <Link
            href="/onboarding"
            className="btn-solid text-[13px] py-1.5 px-4 font-normal"
          >
            Deploy Node →
          </Link>
        </div>
      </header>

      {/* 404 Body */}
      <div className="max-w-xl mx-auto px-6 py-20 text-center flex-1 flex flex-col items-center justify-center">
        <div className="text-[12px] font-mono text-[#222222] opacity-60 mb-4 tracking-tight">
          HTTP 404 // RESOURCE NOT FOUND
        </div>

        <h1 className="text-[34px] sm:text-[42px] font-normal text-[#222222] leading-tight tracking-[-0.02em] mb-4">
          The requested route does not exist.
        </h1>

        <p className="text-[15px] text-[#222222] opacity-75 leading-relaxed mb-8 max-w-md mx-auto">
          The page, table session, or kitchen station you are attempting to reach is unavailable on this node or has moved.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
          <Link href="/" className="btn-solid text-[14px] px-6 py-3">
            Return to RestroDash Index
          </Link>
          <Link href="/onboarding" className="btn-outline text-[14px] px-6 py-3">
            Deploy New Instance
          </Link>
        </div>

        <p className="text-[12px] font-mono text-[#222222] opacity-60">
          Need operational support? Review the{' '}
          <Link href="/#faq" className="underline underline-offset-2 hover:opacity-100">
            Frequently Asked Questions
          </Link>
          .
        </p>
      </div>

      {/* Footer Minimal */}
      <footer className="border-t border-[#e5e5e5] py-6 px-6 text-center text-[12px] font-mono text-[#222222] opacity-60">
        <div className="max-w-7xl mx-auto">
          © {new Date().getFullYear()} RestroDash Technologies Inc. • Authoritative Offline-First POS Engine
        </div>
      </footer>
    </main>
  );
}
