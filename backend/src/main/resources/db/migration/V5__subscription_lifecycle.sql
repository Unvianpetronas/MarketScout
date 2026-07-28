-- ─────────────────────────────────────────────────────────────────────
-- MarketScout — Subscription lifecycle (renewal reminders + downgrade)
--
-- WHY: SubscriptionLifecycleService tracks whether the T-3d/T-1d renewal
-- reminder emails were already sent for a subscription, so the daily sweep
-- never sends the same reminder twice. The JPA entity (Subscription) already
-- has these fields in code, but the app runs with spring.jpa.hibernate.ddl-auto=none,
-- so Hibernate never adds the columns.
--
-- HOW TO RUN (PostgreSQL):
--   psql "$DB_URL" -f backend/src/main/resources/db/subscription_lifecycle.sql
-- It is idempotent (ADD COLUMN IF NOT EXISTS) — safe to run even if the
-- columns already exist.
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS reminder_sent_3d_at timestamptz;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS reminder_sent_1d_at timestamptz;
