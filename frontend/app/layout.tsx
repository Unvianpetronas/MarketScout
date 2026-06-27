import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4, Inter, Sora } from "next/font/google";
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

// Display font for headings (h1–h4)
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MarketScout — Trade Partner Verification",
  description: "Verify your international trade partners with AI-powered intelligence.",
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
          className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} ${inter.variable} ${sora.variable} h-full antialiased`}
      >
      <body className="min-h-full flex flex-col">
      <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
        <AuthProvider>
          <LanguageProvider>
            {children}
            <Toaster position="top-right" />
          </LanguageProvider>
        </AuthProvider>
      </ThemeProvider>
      </body>
      </html>
  );
}