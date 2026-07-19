// Client-side error tracking (Sentry). No-ops with no DSN set — an empty
// dsn is documented Sentry behavior for "disabled", not an error — so this
// is safe to ship even before anyone signs up for a (free-tier) account.
//
// Uses the framework-agnostic @sentry/browser package rather than
// @sentry/nextjs: this project runs a bleeding-edge Next.js version (see
// AGENTS.md) whose APIs may not match what the Next.js-specific Sentry SDK
// expects, so the plain browser SDK is the lower-risk choice. This only
// covers client-side JS errors, not server-side rendering errors — the
// backend (Spring Boot) already has full Sentry coverage via logback.
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || "production",
  tracesSampleRate: 0.1,
});
