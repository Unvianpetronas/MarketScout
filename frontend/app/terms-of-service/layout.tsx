import type { Metadata } from "next";

// Server component wrapper: page.tsx is a client component and therefore
// cannot export metadata itself. Renders children unchanged.
export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms governing your use of the MarketScout platform.",
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
