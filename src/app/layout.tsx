import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
  weight: ['400', '500', '600', '700'],
});

export const viewport: Viewport = {
  themeColor: '#181d26',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://restrodash.in'),
  title: {
    default: 'RestroDash: QR ordering and POS for restaurants',
    template: '%s | RestroDash',
  },
  description:
    'RestroDash is QR ordering and point-of-sale software for restaurants. Guests order from the table and your team sees every order. Book a demo.',
  keywords: [
    'restaurant POS',
    'offline-first POS',
    'restaurant operating system',
    'kitchen display system',
    'KDS',
    'QR dining',
    'ESC/POS thermal printer',
    'tableside ordering',
  ],
  authors: [{ name: 'RestroDash Technologies' }],
  creator: 'RestroDash Technologies',
  publisher: 'RestroDash Technologies',
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/restro-logo.png', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'RestroDash – The Offline-First POS & Operating System for Restaurants',
    description:
      'Enterprise-grade, offline-first restaurant operating system. Collaborative QR dining, multi-station KDS, tableside mobile POS, and thermal printing with zero cloud latency.',
    url: 'https://restrodash.in',
    siteName: 'RestroDash',
    images: [
      {
        url: 'https://restrodash.in/og-image.png',
        width: 1200,
        height: 630,
        alt: 'RestroDash – The Offline-First POS & Operating System for Restaurants',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RestroDash – The Offline-First POS & Operating System for Restaurants',
    description:
      'Enterprise-grade, offline-first restaurant operating system. Collaborative QR dining, multi-station KDS, tableside mobile POS, and thermal printing with zero cloud latency.',
    images: ['https://restrodash.in/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://restrodash.in/#organization',
      name: 'RestroDash Technologies',
      url: 'https://restrodash.in',
      logo: {
        '@type': 'ImageObject',
        url: 'https://restrodash.in/restro-logo.png',
      },
    },
    {
      '@type': 'WebSite',
      '@id': 'https://restrodash.in/#website',
      url: 'https://restrodash.in',
      name: 'RestroDash',
      description: 'The Offline-First POS & Operating System for Restaurants',
      publisher: {
        '@id': 'https://restrodash.in/#organization',
      },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': 'https://restrodash.in/#software',
      name: 'RestroDash',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Windows, macOS, Linux, iOS, Android',
      description:
        'Offline-first restaurant POS and dining operating system. Local SQLite execution, host-peer collaborative QR dining, multi-station kitchen display system (KDS), and direct ESC/POS thermal printing.',
      url: 'https://restrodash.in',
      offers: {
        '@type': 'Offer',
        price: '35000',
        priceCurrency: 'INR',
        priceValidUntil: '2027-12-31',
        url: 'https://restrodash.in#pricing',
        availability: 'https://schema.org/InStock',
      },
    },
    {
      '@type': 'FAQPage',
      '@id': 'https://restrodash.in/#faq',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What happens if our restaurant internet connection drops during rush hour?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Nothing stops. RestroDash runs an authoritative SQLite database engine directly on your local counter hardware (Port 3001). Cashier terminals, tableside waitstaff phones, KDS screens, and thermal receipt printers communicate over your local WiFi router without needing external WAN connectivity. When internet returns, data automatically syncs with your dedicated cloud backup.',
          },
        },
        {
          '@type': 'Question',
          name: 'How does Host-Peer QR table ordering prevent accidental or rogue orders?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The first diner scanning the table QR code is registered as the Table Master (Host). The system generates a clean 4-digit session code. Any dining companion scanning the same table can enter this 4-digit PIN to join the shared cart and propose items. However, checkout authority remains exclusively with the Host, ensuring zero rogue orders.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is our restaurant data isolated from other businesses?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Unlike multi-tenant SaaS systems where thousands of restaurants share a single database table, RestroDash provisions an isolated, dedicated VPS instance with its own SQLite database and custom domain for every restaurant brand. Your sales figures, customer records, and menu data are completely private.',
          },
        },
        {
          '@type': 'Question',
          name: 'What POS hardware and thermal printers are compatible?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'RestroDash supports all standard ESC/POS thermal printers (both 58mm and 80mm paper widths) connected via USB, Ethernet/LAN, or Serial. It runs on Windows, macOS, Linux, and Android/iOS tablet browsers. Our raw byte driver ensures crisp alignment tested against strict golden column oracles.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is included in the ₹35,000 / month flat subscription?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The ₹35,000 / month subscription includes your dedicated cloud VPS instance, unlimited local POS terminals, unlimited QR scans, multi-station Kitchen Display System (KDS), automated daily encrypted cloud backups, and 24/7 dedicated engineering support. We charge 0% commission on orders.',
          },
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${manrope.className} ${manrope.variable} min-h-screen bg-[#FBFAF7] text-[#181818] antialiased selection:bg-[#181818] selection:text-[#FBFAF7]`}
      >
        {children}
      </body>
    </html>
  );
}
