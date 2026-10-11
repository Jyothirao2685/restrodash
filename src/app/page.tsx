import React from 'react';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { ModulesSection } from '@/components/ModulesSection';
import { OrderStepsSection } from '@/components/OrderStepsSection';
import { BentoSection } from '@/components/BentoSection';
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

      {/* Block 2: Modules (Paper background, 6 cards with 4:3 photos) */}
      <ModulesSection />

      {/* Block 3: How an order moves (Ink background, interactive 4-step tabs + 3:2 photos) */}
      <OrderStepsSection />

      {/* Block 4: Built for service hours (Paper alt background, 4-card diagonal bento) */}
      <BentoSection />

      {/* Pricing Section (Paper background, dedicated flat rate manifest) */}
      <PricingSection />

      {/* Block 5: Questions (Paper background, 8 native details disclosure rows) */}
      <FaqSection />

      {/* Block 6: Get Started / Consultation (Paper alt card overlapping the footer) */}
      <DemoSection />

      {/* Block 7: Footer (Footer ink background, 4px amber rule, legal row) */}
      <Footer />
    </div>
  );
}
