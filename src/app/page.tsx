'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { SignatureCoralBand } from '@/components/SignatureCoralBand';
import { DemoGridSection } from '@/components/DemoGridSection';
import { CreamCalloutBand } from '@/components/CreamCalloutBand';
import { SignatureForestBand } from '@/components/SignatureForestBand';
import { PricingSection } from '@/components/PricingSection';
import { DarkCtaBand } from '@/components/DarkCtaBand';
import { LightCtaBanner } from '@/components/LightCtaBanner';
import { FAQSection } from '@/components/FAQSection';
import { Footer } from '@/components/Footer';

export default function LandingPage() {
  const router = useRouter();

  const handleNavigateOnboarding = () => {
    router.push('/onboarding');
  };

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#333840] selection:bg-[#181d26] selection:text-[#ffffff]">
      {/* 1. Sticky Navigation Bar */}
      <Navbar onOpenGetStarted={handleNavigateOnboarding} />

      {/* 2. Hero Section (White Canvas + High-Density POS Interface) */}
      <Hero onOpenGetStarted={handleNavigateOnboarding} />

      {/* 3. Signature Coral Band (#aa2d00) - Offline Engine & WAL Speed */}
      <SignatureCoralBand onOpenGetStarted={handleNavigateOnboarding} />

      {/* 4. Demo Grid Section (Pastel surfaces: Peach, Mint, Yellow, Mustard) */}
      <DemoGridSection />

      {/* 5. Cream Callout Band (#f5e9d4) - Host-Peer 4-Digit PIN Collaborative QR Arc */}
      <CreamCalloutBand />

      {/* 6. Signature Forest Band (#0a2e0e) - Multi-Station KDS & Thermal Print Autonomy */}
      <SignatureForestBand onOpenGetStarted={handleNavigateOnboarding} />

      {/* 7. Commercial Precision Pricing Section (Inter Display dialect + Pill buttons) */}
      <PricingSection onOpenGetStarted={handleNavigateOnboarding} />

      {/* 8. Dark Navy CTA Card (#181d26) */}
      <DarkCtaBand onOpenGetStarted={handleNavigateOnboarding} />

      {/* 9. Light Gray CTA Banner (#e0e2e6) */}
      <LightCtaBanner onOpenGetStarted={handleNavigateOnboarding} />

      {/* 10. FAQ Accordion */}
      <FAQSection />

      {/* 11. Structured Editorial Footer */}
      <Footer />
    </div>
  );
}
