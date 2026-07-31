-- Points a pillar could actually have earned on this report, given which of its
-- underlying facts the data sources returned.
--
-- A Vietnamese company can never earn P1's incorporation-date or legal-
-- representative buckets, because no free registry publishes them — so a company
-- that passed the only check available was shown "50/100 — WARN", which reads as a
-- finding against the company rather than a gap in our coverage. PASS/WARN/FAIL is
-- now graded against this column instead of a flat 100.
--
-- Nullable on purpose: rows written before this column existed keep their original
-- label, and the UI falls back to the old out-of-100 presentation for them. No
-- report a customer has already seen changes.
ALTER TABLE pillar_results
    ADD COLUMN IF NOT EXISTS obtainable_points SMALLINT;

COMMENT ON COLUMN pillar_results.obtainable_points IS
    'Max points this pillar could earn given available data; NULL for rows created before V11.';
