import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Onboarding & Deployment | RestroDash Restaurant POS',
  description:
    'Provision your dedicated, offline-first restaurant instance in 10 minutes. Configure custom subdomain, owner credentials, table topology, and security PINs.',
  alternates: {
    canonical: '/onboarding',
  },
  openGraph: {
    title: 'Deploy RestroDash Restaurant Instance',
    description:
      'Provision your dedicated offline-first restaurant POS in 10 minutes with table layout, owner credentials, and custom subdomain.',
    url: 'https://restrodash.in/onboarding',
    siteName: 'RestroDash',
    images: [
      {
        url: 'https://restrodash.in/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Deploy RestroDash Instance',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Deploy RestroDash Restaurant Instance',
    description:
      'Provision your dedicated offline-first restaurant POS in 10 minutes with table layout, owner credentials, and custom subdomain.',
    images: ['https://restrodash.in/og-image.png'],
  },
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
