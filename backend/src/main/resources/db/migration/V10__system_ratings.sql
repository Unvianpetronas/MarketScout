-- ─────────────────────────────────────────────────────────────────────
-- system_ratings — System Usability Scale (SUS) survey response.
--
-- WHY a second rating table when report_ratings already exists: they measure
-- different things and must not be averaged together. report_ratings asks
-- "was THIS report correct and useful" (output quality, one per report).
-- system_ratings asks "is this PRODUCT usable" (usability, one per user) —
-- the dimension nothing else on /admin/evaluation covers, since every metric
-- there (accuracy, override rate, flag rate, confidence) is about the AI's
-- output rather than the software around it.
--
-- SUS is used rather than a star average because it is a published,
-- benchmarked instrument (Brooke, 1996): 10 Likert items scored to 0–100,
-- where 68 is the established industry average. A standard instrument stays
-- defensible at the small sample sizes this product actually has; a raw star
-- mean over a handful of users does not.
--
-- One row per user (UNIQUE user_id) — the survey is asked exactly once and
-- never again, including when the user skips it. A skip is stored as
-- status='dismissed' with null answers, so "already asked" is a row's
-- existence rather than a separate flag that could drift out of sync.
--
-- ddl-auto=none, so this runs via Flyway on boot. Idempotent.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_ratings (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid        NOT NULL UNIQUE REFERENCES users (id),
    status     varchar(12) NOT NULL CHECK (status IN ('submitted', 'dismissed')),

    -- The 10 SUS items, 1 = strongly disagree .. 5 = strongly agree.
    -- Null only when status='dismissed'. Stored per item rather than as the
    -- score alone so the score can be recomputed and per-item weak spots can
    -- be reported — an aggregate score cannot tell you which part is bad.
    q1  smallint CHECK (q1  BETWEEN 1 AND 5),
    q2  smallint CHECK (q2  BETWEEN 1 AND 5),
    q3  smallint CHECK (q3  BETWEEN 1 AND 5),
    q4  smallint CHECK (q4  BETWEEN 1 AND 5),
    q5  smallint CHECK (q5  BETWEEN 1 AND 5),
    q6  smallint CHECK (q6  BETWEEN 1 AND 5),
    q7  smallint CHECK (q7  BETWEEN 1 AND 5),
    q8  smallint CHECK (q8  BETWEEN 1 AND 5),
    q9  smallint CHECK (q9  BETWEEN 1 AND 5),
    q10 smallint CHECK (q10 BETWEEN 1 AND 5),

    -- Derived from q1..q10 by the fixed SUS formula (odd items: answer-1,
    -- even items: 5-answer, sum x 2.5). Stored so the admin page can average
    -- it in SQL; never edited independently of the answers above.
    score      numeric(5,2) CHECK (score BETWEEN 0 AND 100),

    comment    text,
    created_at timestamptz NOT NULL DEFAULT now(),

    -- A submitted response must carry every answer and a score; a dismissal
    -- must carry none. Without this, a partially-written row would silently
    -- drag the average toward whatever the nulls coalesce to.
    CONSTRAINT chk_system_ratings_complete CHECK (
        (status = 'submitted'
            AND q1 IS NOT NULL AND q2 IS NOT NULL AND q3 IS NOT NULL AND q4 IS NOT NULL
            AND q5 IS NOT NULL AND q6 IS NOT NULL AND q7 IS NOT NULL AND q8 IS NOT NULL
            AND q9 IS NOT NULL AND q10 IS NOT NULL AND score IS NOT NULL)
        OR
        (status = 'dismissed'
            AND q1 IS NULL AND q2 IS NULL AND q3 IS NULL AND q4 IS NULL
            AND q5 IS NULL AND q6 IS NULL AND q7 IS NULL AND q8 IS NULL
            AND q9 IS NULL AND q10 IS NULL AND score IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_system_ratings_status ON system_ratings (status);
