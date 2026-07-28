-- ─────────────────────────────────────────────────────────────────────
-- MarketScout — Payment / quota top-up tables
--
-- WHY: The JPA entities (Invoice, PaymentTransaction, VietqrPayment,
-- QuotaTopup, BillingEvent) already exist in code, but the app runs with
-- spring.jpa.hibernate.ddl-auto=none, so Hibernate never creates tables.
-- If these tables are missing in the database, POST /api/v1/payments/topups
-- fails with "relation ... does not exist" (HTTP 500) → the checkout page
-- shows "could not create the payment order / no QR".
--
-- HOW TO RUN (PostgreSQL):
--   psql "$DB_URL" -f backend/src/main/resources/db/payment_tables.sql
-- It is idempotent (CREATE TABLE IF NOT EXISTS) — safe to run even if some
-- tables already exist.
-- ─────────────────────────────────────────────────────────────────────

-- invoices ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
    id               uuid PRIMARY KEY,
    user_id          uuid        NOT NULL REFERENCES users (id),
    invoice_no       varchar(50) NOT NULL,
    status           varchar(20) NOT NULL DEFAULT 'draft',
    subtotal_vnd     numeric(18) NOT NULL DEFAULT 0,
    tax_vnd          numeric(18) NOT NULL DEFAULT 0,
    total_vnd        numeric(18) NOT NULL DEFAULT 0,
    amount_paid_vnd  numeric(18) NOT NULL DEFAULT 0,
    period_start     timestamptz NOT NULL,
    period_end       timestamptz NOT NULL,
    due_at           timestamptz NOT NULL,
    paid_at          timestamptz,
    created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices (user_id);

-- payment_transactions ────────────────────────────────────────────────
-- payment_method_id is left without a FK constraint on purpose so this
-- migration does not depend on the optional payment_methods table.
CREATE TABLE IF NOT EXISTS payment_transactions (
    id                uuid PRIMARY KEY,
    invoice_id        uuid         NOT NULL REFERENCES invoices (id),
    payment_method_id uuid,
    provider          varchar(20)  NOT NULL,
    provider_ref      varchar(255),
    status            varchar(20)  NOT NULL DEFAULT 'pending',
    amount_vnd        numeric(18)  NOT NULL,
    provider_response text,
    failure_reason    varchar(255),
    retry_count       integer      NOT NULL DEFAULT 0,
    initiated_at      timestamptz  NOT NULL DEFAULT now(),
    completed_at      timestamptz
);
CREATE INDEX IF NOT EXISTS idx_payment_tx_invoice ON payment_transactions (invoice_id);

-- vietqr_payments ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vietqr_payments (
    id                  uuid PRIMARY KEY,
    invoice_id          uuid         NOT NULL REFERENCES invoices (id),
    bank_code           varchar(10)  NOT NULL,
    account_no          varchar(50)  NOT NULL,
    transfer_content    varchar(50)  NOT NULL,
    expected_amount_vnd numeric(18)  NOT NULL,
    qr_data_url         text,
    status              varchar(20)  NOT NULL DEFAULT 'pending',
    matched_ref         varchar(255),
    expires_at          timestamptz  NOT NULL,
    matched_at          timestamptz,
    created_at          timestamptz  NOT NULL DEFAULT now()
);
-- Webhook matches incoming transfers by transfer_content; keep it unique +
-- indexed so the pessimistic-lock lookup is fast and codes never collide.
CREATE UNIQUE INDEX IF NOT EXISTS uq_vietqr_transfer_content ON vietqr_payments (transfer_content);
CREATE INDEX IF NOT EXISTS idx_vietqr_invoice ON vietqr_payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_vietqr_status_expires ON vietqr_payments (status, expires_at);

-- quota_topups ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quota_topups (
    id             uuid PRIMARY KEY,
    user_id        uuid         NOT NULL REFERENCES users (id),
    transaction_id uuid         REFERENCES payment_transactions (id),
    quota_added    integer      NOT NULL,
    price_vnd      numeric(18)  NOT NULL,
    status         varchar(20)  NOT NULL DEFAULT 'pending',
    created_at     timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quota_topups_user ON quota_topups (user_id);
CREATE INDEX IF NOT EXISTS idx_quota_topups_tx ON quota_topups (transaction_id);

-- billing_events ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_events (
    id         uuid PRIMARY KEY,
    user_id    uuid         NOT NULL REFERENCES users (id),
    event_type varchar(100) NOT NULL,
    payload    text,
    created_at timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_billing_events_user ON billing_events (user_id);

-- plan_purchases ──────────────────────────────────────────────────────
-- One-time purchase of a subscription plan via VietQR. On webhook confirmation
-- the user's plan is assigned and the monthly quota granted.
CREATE TABLE IF NOT EXISTS plan_purchases (
    id             uuid PRIMARY KEY,
    user_id        uuid         NOT NULL REFERENCES users (id),
    transaction_id uuid         REFERENCES payment_transactions (id),
    plan_id        integer      NOT NULL REFERENCES plans (id),
    billing_cycle  varchar(20),
    price_vnd      numeric(18)  NOT NULL,
    status         varchar(20)  NOT NULL DEFAULT 'pending',
    created_at     timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plan_purchases_user ON plan_purchases (user_id);
CREATE INDEX IF NOT EXISTS idx_plan_purchases_tx ON plan_purchases (transaction_id);
