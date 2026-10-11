import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Secure Checkout & Activation | RestroDash',
  description: 'Complete dedicated restaurant instance activation with Razorpay and coupon codes.',
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
