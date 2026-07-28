-- ─────────────────────────────────────────────────────────────────────
-- MarketScout — Payment settings (admin-editable top-up credit price)
--
-- WHY: price_per_credit_vnd used to be hardcoded in application.properties
-- (app.payment.price-per-credit-vnd), requiring a redeploy to change. This
-- single-row table lets admins edit it at runtime via
-- GET/PATCH /api/v1/admin/payment-settings.
-- The app runs with spring.jpa.hibernate.ddl-auto=none, so this table must
-- be created manually before that endpoint (or quota top-up purchases) works.
--
-- HOW TO RUN (PostgreSQL):
--   psql "$DB_URL" -f backend/src/main/resources/db/payment_settings.sql
-- It is idempotent — safe to run even if the table/row already exist.
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payment_settings (
    id                    integer     PRIMARY KEY,
    price_per_credit_vnd  numeric(18) NOT NULL,
    updated_at            timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT payment_settings_single_row CHECK (id = 1)
);

INSERT INTO payment_settings (id, price_per_credit_vnd)
VALUES (1, 200000)
ON CONFLICT (id) DO NOTHING;
