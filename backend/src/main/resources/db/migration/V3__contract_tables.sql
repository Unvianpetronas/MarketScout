-- ─────────────────────────────────────────────────────────────────────
-- MarketScout — Contract library & P7 (Deal Structure Risk) verification
--
-- WHY: The JPA entities (Contract, AssessmentContractLink) already exist
-- in code, but the app runs with spring.jpa.hibernate.ddl-auto=none, so
-- Hibernate never creates tables. If these tables are missing, contract
-- upload/link endpoints fail with "relation ... does not exist" (HTTP 500).
--
-- HOW TO RUN (PostgreSQL):
--   psql "$DB_URL" -f backend/src/main/resources/db/contract_tables.sql
-- It is idempotent (CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
-- — safe to run even if some of it already exists.
-- ─────────────────────────────────────────────────────────────────────

-- contracts ───────────────────────────────────────────────────────────
-- A contract file is a reusable library item — "verified" is NOT a
-- property of the file itself, only of a specific (report, contract)
-- link (see assessment_contract_links below). file_data stores the raw
-- file bytes directly in Postgres (capped at 10MB by the upload endpoint)
-- — no external storage service.
CREATE TABLE IF NOT EXISTS contracts (
    id                uuid PRIMARY KEY,
    user_id           uuid         NOT NULL REFERENCES users (id),
    file_name         varchar(255) NOT NULL,
    file_size_bytes   bigint,
    content_type      varchar(100) NOT NULL,
    file_data         bytea        NOT NULL,
    uploaded_at       timestamptz  NOT NULL DEFAULT now(),
    extracted_data    jsonb        NOT NULL DEFAULT '{}',
    extraction_status varchar(20)  NOT NULL DEFAULT 'PENDING',
    created_at        timestamptz  NOT NULL DEFAULT now(),
    updated_at        timestamptz
);
CREATE INDEX IF NOT EXISTS idx_contracts_user ON contracts (user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_uploaded_at ON contracts (uploaded_at DESC);

-- assessment_contract_links ───────────────────────────────────────────
-- Links a contract to a specific report and records the verification
-- outcome FOR THAT USE ONLY. report_id references reports(id) — this
-- codebase has no separate "Assessment" entity, Report is it.
-- Re-linking the same (report, contract) pair always re-runs the cross
-- check rather than reusing a prior VERIFIED status (see ContractLinkService).
CREATE TABLE IF NOT EXISTS assessment_contract_links (
    id                   uuid PRIMARY KEY,
    report_id            uuid         NOT NULL REFERENCES reports (id),
    contract_id          uuid         NOT NULL REFERENCES contracts (id),
    verification_status  varchar(20)  NOT NULL DEFAULT 'PENDING',
    match_details         jsonb,
    field_overrides       jsonb        DEFAULT '{}',
    verified_at          timestamptz,
    created_at           timestamptz  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_acl_report_contract ON assessment_contract_links (report_id, contract_id);
CREATE INDEX IF NOT EXISTS idx_acl_report ON assessment_contract_links (report_id);
CREATE INDEX IF NOT EXISTS idx_acl_contract ON assessment_contract_links (contract_id);

-- reports — self-reported deal info + authoritative P7 contract pointer ─
-- Self-reported fields are ALWAYS "reference only" (weight=0) — they are
-- never read by ScoringEngine/ScoringRubric, only displayed. Only a
-- currently-VERIFIED linked contract (p7_verified_contract_id) can feed
-- real data into the P7 score. Nullable/no default: absence means
-- "not filled in", not "false"/zero.
ALTER TABLE reports ADD COLUMN IF NOT EXISTS self_report_payment_method_safety varchar(10);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS self_report_deposit_percentage smallint;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS self_report_deal_value_usd numeric(18,2);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS self_report_has_written_contract boolean;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS p7_verified_contract_id uuid REFERENCES contracts (id);

-- Deal Safety Agent's structured JSON verdict ({warningLabel, recommendation,
-- requiredProtocols}). Previously appended into raw_data, which is otherwise
-- unused — a rescan/retry would concatenate a second JSON blob onto the first,
-- breaking the frontend's JSON.parse(). Own column = always exactly one
-- verdict, always overwritten cleanly on every (re)run.
ALTER TABLE reports ADD COLUMN IF NOT EXISTS deal_safety_analysis text;
