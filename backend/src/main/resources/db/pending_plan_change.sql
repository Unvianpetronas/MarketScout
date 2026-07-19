-- ─────────────────────────────────────────────────────────────────────
-- MarketScout — deferred plan change (2026-07-20)
--
-- WHY: SePay has no auto-charge, so upgrades/downgrades used to apply
-- immediately mid-cycle (full replace, no proration). New policy: any plan
-- change requested while a paid subscription is still active is recorded
-- here and only takes effect (new checkout prompted) when the current
-- cycle actually ends — the current plan/quota keep running unchanged
-- until then. Upgrading from Free (no active paid subscription) is
-- unaffected — that still checks out immediately, same as before.
--
-- ⚠️ Uses the `users` table — per the note on report_corrections.sql
-- (2026-07-19), confirm this still matches your live schema before running;
-- unlike that file this one only ADDs two nullable columns, so it should be
-- low-risk even if other `users` columns have since diverged, but check.
--
-- HOW TO RUN (PostgreSQL):
--   psql "$DB_URL" -f backend/src/main/resources/db/pending_plan_change.sql
-- Idempotent — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_plan_id integer REFERENCES plans (id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_plan_requested_at timestamptz;
