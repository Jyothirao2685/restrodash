export const copy = {
  pageTitle: 'RestroDash: QR ordering and POS for restaurants',
  metaDescription:
    'RestroDash is QR ordering and point-of-sale software for restaurants. Guests order from the table and your team sees every order. Book a demo.',
  header: {
    links: [
      { label: 'What it does', href: '#modules' },
      { label: 'How it works', href: '#how' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Questions', href: '#faq' },
    ],
    cta: 'Get started',
  },
  hero: {
    h1: 'Orders from the table, straight to the kitchen.',
    lead:
      'RestroDash is QR ordering and point-of-sale software for restaurants. Guests order from their phones and your team sees every order in one place.',
    cta: 'Get started',
    link: 'See how an order moves',
  },
  pricing: {
    h2: 'Simple, transparent pricing',
    sub: 'One flat rate. Complete operational ownership with zero commissions and unlimited terminals.',
    cta: 'Get started',
    features: [
      'Dedicated cloud VPS instance & custom subdomain',
      'Unlimited local POS counter terminals',
      'Unlimited QR table ordering scans',
      'Multi-station Kitchen Display System (KDS)',
      'Raw ESC/POS thermal printing binary driver',
      '0% per-order commission',
      'Automated daily encrypted backups',
    ],
  },
  modules: {
    h2: 'From the table to the kitchen to the bill',
    items: [
      {
        id: 'qr-ordering',
        title: 'QR ordering',
        description:
          'Each table gets a QR code. Guests scan it, browse the menu and place an order from their phone.',
        image: '/images/module-qr.jpg',
        imageAlt: 'Dining table with place settings and tableware ready for service',
      },
      {
        id: 'point-of-sale',
        title: 'Point of sale',
        description: 'Take counter and table orders, split bills and print receipts.',
        image: '/images/module-pos.jpg',
        imageAlt: 'Counter station and cafe service area',
      },
      {
        id: 'kitchen-orders',
        title: 'Kitchen orders',
        description:
          'New orders reach the kitchen as they are placed, as a printed ticket or on a kitchen screen.',
        image: '/images/module-kitchen.jpg',
        imageAlt: 'Kitchen pass with freshly prepared dishes',
      },
      {
        id: 'menu-management',
        title: 'Menu management',
        description:
          'Edit items, prices and availability once. Changes apply to every table and the counter.',
        image: '/images/module-menu.jpg',
        imageAlt: 'Culinary prep and fresh ingredients ready for cooking',
      },
      {
        id: 'payments',
        title: 'Payments',
        description:
          'Settle the bill at the table or at the counter with the payment methods you set up.',
        image: '/images/module-payments.jpg',
        imageAlt: 'Restaurant dining table settling the bill',
      },
      {
        id: 'reports',
        title: 'Reports',
        description: 'See sales by day, item and table, and export them for your accountant.',
        image: '/images/module-reports.jpg',
        imageAlt: 'Desk ledger and sales summary review',
      },
    ],
  },
  steps: {
    h2: 'How an order moves',
    items: [
      {
        step: 1,
        title: "Guest scans the table's QR code.",
        description: "The menu opens in the phone's browser.",
        image: '/images/step-1.jpg',
        imageAlt: 'Guest seated at a dining table holding a phone with screen angled away',
      },
      {
        step: 2,
        title: 'Guest places the order.',
        description: 'Items and notes go straight to your team.',
        image: '/images/step-2.jpg',
        imageAlt: 'Guests at a restaurant table discussing the menu together',
      },
      {
        step: 3,
        title: 'The kitchen prepares it.',
        description: 'The order prints or appears at the right station.',
        image: '/images/step-3.jpg',
        imageAlt: 'Chef plating warm dishes on the kitchen pass',
      },
      {
        step: 4,
        title: 'The bill is settled.',
        description: 'Guests pay at the table or at the counter, and the sale is recorded.',
        image: '/images/step-4.jpg',
        imageAlt: 'Bill presented on a clean wooden board at the table',
      },
    ],
  },
  bento: {
    h2: 'Built for service hours',
    items: [
      {
        id: 'no-install',
        title: 'Guests install nothing.',
        description: "The menu opens from the QR code in the phone's browser.",
        theme: 'light',
        colSpan: 'lg:col-span-8',
      },
      {
        id: 'one-list',
        title: 'One list of orders.',
        description: 'Table, counter and kitchen work from the same orders.',
        theme: 'dark',
        colSpan: 'lg:col-span-4',
      },
      {
        id: 'edit-once',
        title: 'Edit the menu once.',
        description: 'A price or availability change applies everywhere at once.',
        theme: 'dark',
        colSpan: 'lg:col-span-4',
      },
      {
        id: 'person-to-call',
        title: 'A person to call.',
        description: 'Phone and email support when you need it.',
        theme: 'light',
        colSpan: 'lg:col-span-8',
      },
    ],
  },
  faq: {
    h2: 'Questions',
    sub: 'Clear answers on how RestroDash works on your floor.',
    items: [
      {
        q: 'Do guests need an app?',
        a: "No. Guests scan the QR code with their phone's camera, and the menu opens immediately in their mobile browser. No downloads or signups required.",
      },
      {
        q: 'How do guests pay?',
        a: 'Guests can settle the bill at the table through supported digital payment methods, or pay cash/card at the counter when you generate the final bill.',
      },
      {
        q: 'Does it work with our printers and hardware?',
        a: 'Yes. RestroDash connects with standard ESC/POS thermal printers (both 58mm and 80mm paper widths) via USB, LAN, or Serial, and runs on your existing counter computers and tablets.',
      },
      {
        q: 'Can we change menu items and prices ourselves?',
        a: "Yes. Any updates to menu items, descriptions, prices, or 86'd out-of-stock items take effect instantly across all table QR menus and cashier terminals.",
      },
      {
        q: 'What happens when the internet drops?',
        a: 'Core operations continue locally on your premise network. Counter billing, kitchen KDS tickets, and receipt printing execute without WAN connection and sync when connectivity returns.',
      },
      {
        q: 'How long does setup take, and who does it?',
        a: 'Initial setup takes less than 15 minutes. We provision your dedicated restaurant instance, upload your menu, and configure table QR codes with you.',
      },
      {
        q: 'What does it cost?',
        a: 'We offer transparent pricing with flat monthly rates and zero per-order commissions. We share exact tier options during your demo call.',
      },
      {
        q: 'Who owns our data?',
        a: 'You own 100% of your sales records, customer data, and menu catalog. Your restaurant runs on an isolated dedicated instance with daily backups.',
      },
    ],
  },
  demoForm: {
    h2: 'Get started',
    sub: 'Tell us about your restaurant and we will call you to set a time.',
    qrCaption: 'Open this form on your phone.',
    fields: {
      name: 'Full Name',
      phone: 'Phone Number',
      restaurant: 'Restaurant Name',
      city: 'City',
      email: 'Email Address',
      interest: 'What would you like to see?',
    },
    interestOptions: [
      { label: 'QR ordering', value: 'qr' },
      { label: 'POS', value: 'pos' },
      { label: 'Both', value: 'both' },
    ],
    cta: 'Request a demo',
    consent: 'By submitting, you agree to our Privacy Policy.',
    success: 'Thanks, {name}. We will call {phone} to set a time.',
  },
  footer: {
    description:
      'QR ordering and point-of-sale software for restaurants. Direct tableside orders straight to the kitchen.',
    phone: '+91 98765 43210',
    email: 'support@restrodash.in',
    links: [
      { label: 'What it does', href: '#modules' },
      { label: 'How it works', href: '#how' },
      { label: 'Questions', href: '#faq' },
      { label: 'Book a demo', href: '#demo' },
    ],
    legal: '© 2026 RestroDash Technologies Inc. All rights reserved.',
  },
};
