-- ─────────────────────────────────────────────────────────────────────
-- report_ratings — user satisfaction rating on a finished report.
-- One rating per report (a report belongs to a single owner). Feeds the
-- admin "Đánh giá hệ thống" evaluation page (satisfaction signal), alongside
-- report_flags (wrong-result signal) and admin overrides (ground-truth).
--
-- ddl-auto=none, so this runs via spring.sql.init on boot. Idempotent.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS report_ratings (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id  uuid        NOT NULL UNIQUE REFERENCES reports (id) ON DELETE CASCADE,
    user_id    uuid        NOT NULL REFERENCES users (id),
    stars      smallint    NOT NULL CHECK (stars BETWEEN 1 AND 5),
    comment    text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_report_ratings_stars ON report_ratings (stars);
