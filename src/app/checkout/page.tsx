'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CheckoutPage() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect to /onboarding since RestroDash is 100% free and open-source
    const timer = setTimeout(() => {
      router.push('/onboarding');
    }, 2500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-xl p-8 text-center space-y-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">RestroDash is 100% Free</h1>
          <p className="text-sm text-neutral-400">
            No subscription or payment gateway is required. RestroDash is open-source under the MIT License.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-400 text-left space-y-2">
          <div className="flex items-center gap-2 text-neutral-200 font-semibold">
            <span>✨ Zero Gatekeeping</span>
          </div>
          <p>
            You get direct access to table QR dining, the POS counter engine, and KDS without entering credit card details.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/onboarding"
            className="inline-block w-full py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors"
          >
            Go directly to Setup & Launch →
          </Link>
          <p className="text-xs text-neutral-500 mt-3">Redirecting automatically in a moment...</p>
        </div>
      </div>
    </div>
  );
}
