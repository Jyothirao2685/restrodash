import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { copy } from '@/content/copy';

export function Hero() {
  const heroPhotos = [
    {
      src: '/images/hero-1.jpg',
      alt: 'Table setting with laid place cards and glassware',
      stagger: 'translate-y-0',
    },
    {
      src: '/images/hero-2.jpg',
      alt: 'Guest at restaurant table holding phone angled away',
      stagger: 'translate-y-8 sm:translate-y-12',
    },
    {
      src: '/images/hero-3.jpg',
      alt: 'Prepared culinary dishes on warm kitchen counter pass',
      stagger: 'translate-y-4 sm:translate-y-6',
    },
    {
      src: '/images/hero-4.jpg',
      alt: 'Server with service tray in restaurant dining room',
      stagger: 'translate-y-12 sm:translate-y-16',
    },
  ];

  return (
    <section className="relative bg-[#181818] text-[#FFFFFF] rounded-b-[32px] overflow-hidden pt-16 sm:pt-24 pb-20 sm:pb-32">
      {/* Subtle QR-dot texture behind text at 4% white */}
      <div
        className="absolute inset-0 bg-qr-dots opacity-40 pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-[1200px] mx-auto px-6">
        {/* Centered Column (880px max) */}
        <div className="max-w-[880px] mx-auto text-center">
          <h1 className="text-[40px] sm:text-[54px] lg:text-[64px] font-normal leading-[1.1] tracking-[-0.03em] text-[#FFFFFF] mb-6 text-balance">
            {copy.hero.h1}
          </h1>

          <p className="text-[18px] sm:text-[20px] font-normal leading-[1.5] text-[#B5B0A6] max-w-[680px] mx-auto mb-10 text-balance">
            {copy.hero.lead}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 mb-16 sm:mb-20">
            <Link href="/onboarding" className="btn-white text-[15px] px-8 py-3.5">
              {copy.hero.cta}
            </Link>
            <a
              href="#pricing"
              className="text-[15px] font-normal text-[#FFFFFF] underline underline-offset-8 hover:text-[#B5B0A6] transition-colors"
            >
              {copy.hero.link}
            </a>
          </div>
        </div>

        {/* 4 Staggered Photo Cards (4:5 ratio, no UI screens) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-4">
          {heroPhotos.map((photo, i) => (
            <div
              key={i}
              className={`relative aspect-[4/5] rounded-[20px] overflow-hidden bg-[#222222] transition-transform duration-300 ${photo.stagger}`}
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                priority={i === 0}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 280px"
                className="object-cover transition-transform duration-500 hover:scale-[1.03]"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
