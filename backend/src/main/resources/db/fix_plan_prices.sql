-- ─────────────────────────────────────────────────────────────────────
-- MarketScout — fix wrong seed prices on plans (2026-07-20)
--
-- WHY: /pricing was showing "0.0M VND" for Starter/Pro with mismatched USD
-- figures (~9.99 / ~29.99) — the live public-pricing sync added 2026-07-19
-- is working correctly, it's just faithfully displaying what's actually in
-- the `plans` table, which has placeholder/wrong seed data. This sets the
-- real prices used everywhere else in the app (checkout summary, i18n copy):
-- Starter 2,000,000 VND (~80 USD), Pro 5,800,000 VND (~230 USD).
--
-- Uses the `plans` table — this is NOT one of the tables flagged as
-- possibly-stale ("hệ thống cũ"); it's the same table the working
-- /admin/billing panel already reads/writes successfully.
--
-- HOW TO RUN (PostgreSQL):
--   psql "$DB_URL" -f backend/src/main/resources/db/fix_plan_prices.sql
-- Idempotent — safe to re-run. Prefer running this over /admin/billing if
-- you want it scripted; either works since they hit the same table.
-- ─────────────────────────────────────────────────────────────────────

UPDATE plans SET price_vnd = 2000000, price_usd = 80  WHERE lower(name) = 'starter';
UPDATE plans SET price_vnd = 5800000, price_usd = 230 WHERE lower(name) = 'pro';

-- Sanity check after running:
-- SELECT name, price_vnd, price_usd, monthly_quota, is_active FROM plans ORDER BY id;
