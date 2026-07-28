-- ─────────────────────────────────────────────────────────────────────
-- MarketScout — Report correction & flag tables
--
-- WHY: Before this, an admin's only lever on a wrong report was to delete
-- it or re-run the whole 8-pillar pipeline from scratch — no way to correct
-- a specific score/risk-level/hard-stop, and no way for a user to flag a
-- result as wrong at all. That's a real gap for a product that publishes
-- risk verdicts (including sanctions screening) about real companies.
--
-- The app runs with spring.jpa.hibernate.ddl-auto=none, so this must be run
-- by hand before the Report override columns / ReportFlag entity work.
--
-- HOW TO RUN (PostgreSQL):
--   psql "$DB_URL" -f backend/src/main/resources/db/report_corrections.sql
-- Idempotent — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────

-- Admin correction columns on reports. Deliberately additive: the original
-- AI-computed overall_score / risk_level / hard_stop columns are never
-- overwritten, so what the pipeline actually produced stays intact for
-- audit even after a human correction is applied on top.
ALTER TABLE reports ADD COLUMN IF NOT EXISTS override_score      smallint;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS override_risk_level varchar(20);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS override_hard_stop  boolean;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS override_note       text;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS overridden_by       uuid REFERENCES users (id);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS overridden_at       timestamptz;

-- report_flags ───────────────────────────────────────────────────────
-- A user's "báo kết quả sai" submission against their own report.
CREATE TABLE IF NOT EXISTS report_flags (
    id           uuid PRIMARY KEY,
    report_id    uuid        NOT NULL REFERENCES reports (id),
    user_id      uuid        NOT NULL REFERENCES users (id),
    reason       varchar(30) NOT NULL,
    note         text,
    status       varchar(20) NOT NULL DEFAULT 'open',
    resolved_by  uuid REFERENCES users (id),
    resolved_at  timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_report_flags_report ON report_flags (report_id);
CREATE INDEX IF NOT EXISTS idx_report_flags_status ON report_flags (status);

-- Defensive: if report_flags was created by an earlier, partial version of this
-- script (before resolve/dismiss existed), the CREATE TABLE IF NOT EXISTS above
-- is a no-op and would NOT add these columns — so PATCH /admin/report-flags/{id}
-- (resolve/dismiss) fails on a missing resolved_by/resolved_at. Add them idempotently.
ALTER TABLE report_flags ADD COLUMN IF NOT EXISTS note        text;
ALTER TABLE report_flags ADD COLUMN IF NOT EXISTS status      varchar(20) NOT NULL DEFAULT 'open';
ALTER TABLE report_flags ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES users (id);
ALTER TABLE report_flags ADD COLUMN IF NOT EXISTS resolved_at timestamptz;
