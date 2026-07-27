import type { Metadata } from "next";
import { ViewTransition } from "react";
import { Geist, Geist_Mono, Source_Serif_4, Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/providers/auth-provider";
import { LanguageProvider } from "@/providers/language-provider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin", "vietnamese"],
});

// Body font — supports Vietnamese, replaces the Google Fonts @import in globals.css
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

// Display font for headings + stat numbers — the MarketScout design-system face.
const displayFont = Plus_Jakarta_Sans({
  variable: "--font-display-face",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700", "800"],
});

// Every route rendered a client component, so none of them could export
// metadata and all 30 shared this one title. Child routes now set their own
// via a server-component layout.tsx; `template` keeps the brand suffix.
export const metadata: Metadata = {
  title: {
    default: "MarketScout — Trade Partner Verification",
    template: "%s — MarketScout",
  },
  description:
    "Verify international trade partners with an 8-pillar AI assessment across 190+ countries: registration, sanctions screening, financials and contract checks.",
  icons: { icon: "/logo.png" },
  openGraph: {
    siteName: "MarketScout",
    type: "website",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
                                     children,
                                   }: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html
          lang="en"
          suppressHydrationWarning
          className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} ${inter.variable} ${displayFont.variable} h-full antialiased`}
      >
      <body className="min-h-full flex flex-col">
      <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
        <AuthProvider>
          <LanguageProvider>
            <ViewTransition>{children}</ViewTransition>
            <Toaster position="top-right" />
          </LanguageProvider>
        </AuthProvider>
      </ThemeProvider>
      </body>
      </html>
  );
}