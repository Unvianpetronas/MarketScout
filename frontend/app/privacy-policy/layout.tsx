import type { Metadata } from "next";

// Server component wrapper: page.tsx is a client component and therefore
// cannot export metadata itself. Renders children unchanged.
export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How MarketScout collects, uses and protects the data you submit for trade partner verification.",
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
