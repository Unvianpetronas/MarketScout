// Pricing page static data — kept framework-free (no React/Next imports) so
// it can be unit-tested directly (see plans-data.test.ts), and so the plan
// card's featureCount/noFeatureCount can never silently drift out of sync
// with the i18n keys it renders (exactly the class of bug fixed 2026-07-19:
// removing the "API Access" feature required manually re-indexing every
// feature.N key AND decrementing these counts by hand).

// Static fallback prices — shown while the live /payments/plans fetch is in
// flight, or if it fails. The live-fetched price (admin-editable, same
// source the checkout page charges) always overrides these once loaded, so
// the pricing page can never show a stale price for longer than the initial
// fetch.
export const PLANS = [
  {
    id: "free",
    priceVnd: 0,
    priceUsd: 0,
    isFree: true,
    isPopular: false,
    href: "/register",
    cardStyle: "border-gray-200 bg-white",
    ctaStyle: "border border-gray-300 text-gray-700 hover:bg-gray-50",
    accentColor: "#9CA3AF",
    featureCount: 4,
    noFeatureCount: 3,
  },
  {
    id: "starter",
    priceVnd: 2000000,
    priceUsd: 80,
    isFree: false,
    isPopular: false,
    href: "/checkout?plan=starter",
    cardStyle: "border-blue-200 bg-white",
    ctaStyle: "border border-blue-500 text-blue-700 hover:bg-blue-50",
    accentColor: "#3B82F6",
    featureCount: 5,
    noFeatureCount: 1,
  },
  {
    id: "pro",
    priceVnd: 5800000,
    priceUsd: 230,
    isFree: false,
    isPopular: true,
    href: "/checkout?plan=pro",
    cardStyle: "border-[#00D26A] bg-white ring-2 ring-[#00D26A]/20",
    ctaStyle: "gradient-brand text-white hover:opacity-90",
    accentColor: "#00D26A",
    featureCount: 6,
    noFeatureCount: 1,
  },
  {
    id: "enterprise",
    priceVnd: 0, // Custom
    priceUsd: 0,
    isFree: false,
    isPopular: false,
    isCustom: true,
    href: "mailto:unviantruong26@gmail.com",
    cardStyle: "border-gray-800 bg-[#0A1A12]",
    ctaStyle: "gradient-brand text-white hover:opacity-90",
    accentColor: "#00D26A",
    featureCount: 7,
    noFeatureCount: 0,
    isDark: true,
  },
];

export const FAQS = ["quotaExpire", "changePlan", "trial", "dataSource"];
