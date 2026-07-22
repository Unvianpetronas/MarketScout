// The MarketScout brand mark. Renders just the logo image (no wordmark) so each
// caller keeps its own "MarketScout" text, link target, and subtitle. Sized via
// Tailwind classes passed by the caller (e.g. "w-8 h-8").
export function Logo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="MarketScout"
      className={`${className} rounded-xl object-contain shrink-0`}
    />
  );
}
