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
-- ⚠️ NOT a migration, and NOT safe to re-run blindly. This is an
-- unconditional UPDATE: it overwrites whatever price is currently in the
-- table, including one an admin has since set via /admin/billing. It lives
-- in db/adhoc/ (not db/migration/) precisely so Flyway never applies it and
-- no deploy can silently reset live prices back to these seed values.
--
-- HOW TO RUN (PostgreSQL) — only for a fresh environment whose `plans` rows
-- still hold the wrong placeholder seed data:
--   psql "$DB_URL" -f backend/src/main/resources/db/adhoc/fix_plan_prices.sql
-- ─────────────────────────────────────────────────────────────────────

UPDATE plans SET price_vnd = 2000000, price_usd = 80  WHERE lower(name) = 'starter';
UPDATE plans SET price_vnd = 5800000, price_usd = 230 WHERE lower(name) = 'pro';

-- Sanity check after running:
-- SELECT name, price_vnd, price_usd, monthly_quota, is_active FROM plans ORDER BY id;
