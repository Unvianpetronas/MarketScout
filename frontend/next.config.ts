import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Enables React's <ViewTransition> so route changes crossfade natively
    // instead of hard-cutting. See app/layout.tsx + globals.css.
    viewTransition: true,
  },
};

export default nextConfig;
