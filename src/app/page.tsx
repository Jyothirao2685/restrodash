import React from 'react';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { ModulesSection } from '@/components/ModulesSection';
import { PricingSection } from '@/components/PricingSection';
import { FaqSection } from '@/components/FaqSection';
import { DemoSection } from '@/components/DemoSection';
import { Footer } from '@/components/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FBFAF7] text-[#181818] selection:bg-[#181818] selection:text-[#FBFAF7]">
      {/* Block 0: Header (Ink background, sticky) */}
      <Header />

      {/* Block 1: Hero (Ink background, rounded base, 4 staggered photos) */}
      <Hero />

      {/* Block 2: Modules (Paper background, 3 physical operations cards with 4:3 photos) */}
      <ModulesSection />

      {/* Pricing Section (Paper background, dedicated flat rate manifest) */}
      <PricingSection />

      {/* Block 5: Questions (Paper background, 8 native details disclosure rows) */}
      <FaqSection />

      {/* Block 6: Get Started / Consultation (Paper alt card overlapping the footer) */}
      <DemoSection />

      {/* Block 6: Footer (Footer ink background, white rule, legal row) */}
      <Footer />
    </div>
  );
}
