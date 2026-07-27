import type { Metadata } from "next";

// Server component wrapper: page.tsx is a client component and therefore
// cannot export metadata itself. Renders children unchanged.
export const metadata: Metadata = {
  title: "Support",
  description: "Get help with MarketScout — contact support and browse common questions.",
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
