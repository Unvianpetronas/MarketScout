import type { Metadata } from "next";

// Server component wrapper: page.tsx is a client component and therefore
// cannot export metadata itself. Renders children unchanged.
export const metadata: Metadata = {
  title: "Pricing",
  description:
    "MarketScout plans and pricing — from a free tier with 5 monthly verifications to Enterprise. Compare quotas, features and top-up credits.",
  openGraph: {
    title: "Pricing — MarketScout",
    description:
      "Compare MarketScout plans: monthly verification quotas, features and top-up credits.",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
