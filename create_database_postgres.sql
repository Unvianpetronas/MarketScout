-- ============================================================
-- MarketScout — PostgreSQL Database Creation Script (PRODUCTION)
-- Target : PostgreSQL (localhost:5432 or cloud host)
-- DB Name: marketscout
--
-- Run as superuser or a user with CREATEDB privilege:
--   psql -U postgres -f create_database_postgres.sql
--
-- Or two-step (if the DB already exists):
--   psql -U postgres -d marketscout -f create_database_postgres.sql
-- ============================================================

-- ── Create database ───────────────────────────────────────────────────
SELECT 'CREATE DATABASE marketscout ENCODING ''UTF8'''
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'marketscout')\gexec

\c marketscout

-- UUID generation (built-in in PG 13+, pgcrypto for older versions)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. plans  (no FK deps)
-- ============================================================
CREATE TABLE plans (
    id              SERIAL          NOT NULL,
    name            VARCHAR(50)     NOT NULL,
    billing_cycle   VARCHAR(20)     NOT NULL DEFAULT 'monthly',
    price_usd       NUMERIC(18,2)   NULL,
    price_vnd       NUMERIC(18,0)   NULL,
    monthly_quota   INT             NOT NULL,
    features        TEXT            NULL,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT PK_plans PRIMARY KEY (id)
);

-- ============================================================
-- 2. users  (FK -> plans)
-- ============================================================
CREATE TABLE users (
    id                    UUID            NOT NULL DEFAULT gen_random_uuid(),
    plan_id               INT             NULL,
    email                 VARCHAR(255)    NOT NULL,
    password_hash         VARCHAR(255)    NOT NULL,
    full_name             VARCHAR(200)    NULL,
    quota_remaining       INT             NOT NULL DEFAULT 0,
    quota_used_this_cycle INT             NOT NULL DEFAULT 0,
    cycle_reset_at        TIMESTAMPTZ     NULL,
    is_active             BOOLEAN         NOT NULL DEFAULT TRUE,
    last_login_at         TIMESTAMPTZ     NULL,
    created_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ     NULL,
    deleted_at            TIMESTAMPTZ     NULL,
    role                  VARCHAR(20)     NOT NULL DEFAULT 'user',
    tax_id                VARCHAR(50)     NULL,
    phone                 VARCHAR(30)     NULL,
    company_website       VARCHAR(300)    NULL,
    headquarters_addr     VARCHAR(500)    NULL,
    industry              VARCHAR(100)    NULL,
    annual_revenue        VARCHAR(50)     NULL,
    business_desc         TEXT            NULL,
    target_markets        TEXT            NULL,
    certifications        TEXT            NULL,
    theme                 VARCHAR(10)     NOT NULL DEFAULT 'system',
    language              VARCHAR(2)      NOT NULL DEFAULT 'vi',
    ai_optimization       BOOLEAN         NOT NULL DEFAULT TRUE,
    company_name          VARCHAR(300)    NULL,
    email_verified        BOOLEAN         NOT NULL DEFAULT FALSE,
    CONSTRAINT PK_users      PRIMARY KEY (id),
    CONSTRAINT FK_users_plan FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- ============================================================
-- 3. subscriptions  (FK -> users, plans)
-- ============================================================
CREATE TABLE subscriptions (
    id                   UUID            NOT NULL DEFAULT gen_random_uuid(),
    user_id              UUID            NOT NULL,
    plan_id              INT             NOT NULL,
    status               VARCHAR(20)     NOT NULL DEFAULT 'trialing',
    billing_cycle        VARCHAR(20)     NOT NULL DEFAULT 'monthly',
    current_period_start TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    current_period_end   TIMESTAMPTZ     NOT NULL,
    trial_end            TIMESTAMPTZ     NULL,
    cancel_at            TIMESTAMPTZ     NULL,
    created_at           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ     NULL,
    CONSTRAINT PK_subscriptions      PRIMARY KEY (id),
    CONSTRAINT FK_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT FK_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- ============================================================
-- 4. api_tokens  (FK -> users)
-- ============================================================
CREATE TABLE api_tokens (
    id           UUID            NOT NULL DEFAULT gen_random_uuid(),
    user_id      UUID            NOT NULL,
    token_hash   VARCHAR(255)    NOT NULL,
    label        VARCHAR(100)    NULL,
    last_used_at TIMESTAMPTZ     NULL,
    expires_at   TIMESTAMPTZ     NULL,
    created_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT PK_api_tokens      PRIMARY KEY (id),
    CONSTRAINT FK_api_tokens_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- 5. audit_logs  (FK -> users, nullable)
-- ============================================================
CREATE TABLE audit_logs (
    id          UUID            NOT NULL DEFAULT gen_random_uuid(),
    actor_id    UUID            NULL,
    "action"    VARCHAR(100)    NOT NULL,
    target_type VARCHAR(50)     NULL,
    target_id   UUID            NULL,
    payload     TEXT            NULL,
    ip_address  VARCHAR(45)     NULL,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT PK_audit_logs       PRIMARY KEY (id),
    CONSTRAINT FK_audit_logs_actor FOREIGN KEY (actor_id) REFERENCES users(id)
);

-- ============================================================
-- 6. billing_events  (FK -> users)
-- ============================================================
CREATE TABLE billing_events (
    id         UUID            NOT NULL DEFAULT gen_random_uuid(),
    user_id    UUID            NOT NULL,
    event_type VARCHAR(100)    NOT NULL,
    payload    TEXT            NULL,
    created_at TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT PK_billing_events      PRIMARY KEY (id),
    CONSTRAINT FK_billing_events_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- 7. chat_sessions  (FK -> users)
-- ============================================================
CREATE TABLE chat_sessions (
    id         UUID            NOT NULL DEFAULT gen_random_uuid(),
    user_id    UUID            NOT NULL,
    title      VARCHAR(300)    NULL,
    updated_at TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT PK_chat_sessions      PRIMARY KEY (id),
    CONSTRAINT FK_chat_sessions_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- 8. chat_messages  (no FK in model)
-- ============================================================
CREATE TABLE chat_messages (
    id         UUID            NOT NULL DEFAULT gen_random_uuid(),
    role       VARCHAR(20)     NOT NULL,
    content    TEXT            NOT NULL,
    created_at TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT PK_chat_messages PRIMARY KEY (id)
);

-- ============================================================
-- 9. deal_analyses  (no FK)
-- ============================================================
CREATE TABLE deal_analyses (
    id                   UUID            NOT NULL DEFAULT gen_random_uuid(),
    recommended_incoterm VARCHAR(10)     NULL,
    payment_method       VARCHAR(10)     NULL,
    risk_factors         TEXT            NULL,
    CONSTRAINT PK_deal_analyses PRIMARY KEY (id)
);

-- ============================================================
-- 10. embeddings  (no FK)
-- ============================================================
CREATE TABLE embeddings (
    id        UUID    NOT NULL DEFAULT gen_random_uuid(),
    embedding BYTEA   NULL,
    CONSTRAINT PK_embeddings PRIMARY KEY (id)
);

-- ============================================================
-- 11. entity_cache  (no FK, string PK)
-- ============================================================
CREATE TABLE entity_cache (
    cache_key   VARCHAR(450)    NOT NULL,
    pillar_no   SMALLINT        NOT NULL,
    cached_data TEXT            NOT NULL,
    expires_at  TIMESTAMPTZ     NOT NULL,
    CONSTRAINT PK_entity_cache PRIMARY KEY (cache_key)
);

-- ============================================================
-- 12. image_assets  (no FK)
-- ============================================================
CREATE TABLE image_assets (
    id        UUID            NOT NULL DEFAULT gen_random_uuid(),
    minio_key VARCHAR(500)    NOT NULL,
    status    VARCHAR(20)     NOT NULL DEFAULT 'uploaded',
    file_size BIGINT          NULL,
    CONSTRAINT PK_image_assets PRIMARY KEY (id)
);

-- ============================================================
-- 13. invoices  (FK -> users)
-- ============================================================
CREATE TABLE invoices (
    id              UUID            NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL,
    invoice_no      VARCHAR(50)     NOT NULL,
    status          VARCHAR(20)     NOT NULL DEFAULT 'draft',
    subtotal_vnd    NUMERIC(18,0)   NOT NULL DEFAULT 0,
    tax_vnd         NUMERIC(18,0)   NOT NULL DEFAULT 0,
    total_vnd       NUMERIC(18,0)   NOT NULL DEFAULT 0,
    amount_paid_vnd NUMERIC(18,0)   NOT NULL DEFAULT 0,
    period_start    TIMESTAMPTZ     NOT NULL,
    period_end      TIMESTAMPTZ     NOT NULL,
    due_at          TIMESTAMPTZ     NOT NULL,
    paid_at         TIMESTAMPTZ     NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT PK_invoices      PRIMARY KEY (id),
    CONSTRAINT FK_invoices_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- 14. long_term_memory  (FK -> users)
-- ============================================================
CREATE TABLE long_term_memory (
    id         UUID            NOT NULL DEFAULT gen_random_uuid(),
    user_id    UUID            NOT NULL,
    memory_key VARCHAR(100)    NOT NULL,
    content    TEXT            NOT NULL,
    updated_at TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT PK_long_term_memory      PRIMARY KEY (id),
    CONSTRAINT FK_long_term_memory_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- 15. model_run_logs  (no FK)
-- ============================================================
CREATE TABLE model_run_logs (
    id            UUID            NOT NULL DEFAULT gen_random_uuid(),
    model_name    VARCHAR(100)    NOT NULL,
    model_version VARCHAR(50)     NULL,
    input_tokens  INT             NULL,
    output_tokens INT             NULL,
    latency_ms    INT             NULL,
    cost_usd      NUMERIC(18,6)   NULL DEFAULT 0,
    created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT PK_model_run_logs PRIMARY KEY (id)
);

-- ============================================================
-- 16. notifications  (FK -> users)
-- ============================================================
CREATE TABLE notifications (
    id         UUID            NOT NULL DEFAULT gen_random_uuid(),
    user_id    UUID            NOT NULL,
    type       VARCHAR(50)     NOT NULL,
    title      VARCHAR(200)    NOT NULL,
    body       TEXT            NULL,
    payload    TEXT            NULL,
    is_read    BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT PK_notifications      PRIMARY KEY (id),
    CONSTRAINT FK_notifications_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- 17. payment_methods  (FK -> users)
-- ============================================================
CREATE TABLE payment_methods (
    id             UUID            NOT NULL DEFAULT gen_random_uuid(),
    user_id        UUID            NOT NULL,
    provider       VARCHAR(20)     NOT NULL,
    method_type    VARCHAR(20)     NOT NULL,
    display_name   VARCHAR(100)    NOT NULL,
    provider_token VARCHAR(500)    NOT NULL,
    metadata       TEXT            NULL,
    is_default     BOOLEAN         NOT NULL DEFAULT FALSE,
    is_active      BOOLEAN         NOT NULL DEFAULT TRUE,
    expires_at     TIMESTAMPTZ     NULL,
    created_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT PK_payment_methods      PRIMARY KEY (id),
    CONSTRAINT FK_payment_methods_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- 18. payment_transactions  (FK -> invoices, payment_methods)
-- ============================================================
CREATE TABLE payment_transactions (
    id                UUID            NOT NULL DEFAULT gen_random_uuid(),
    invoice_id        UUID            NOT NULL,
    payment_method_id UUID            NULL,
    provider          VARCHAR(20)     NOT NULL,
    provider_ref      VARCHAR(255)    NULL,
    status            VARCHAR(20)     NOT NULL DEFAULT 'pending',
    amount_vnd        NUMERIC(18,0)   NOT NULL,
    provider_response TEXT            NULL,
    failure_reason    VARCHAR(255)    NULL,
    retry_count       INT             NOT NULL DEFAULT 0,
    initiated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    completed_at      TIMESTAMPTZ     NULL,
    CONSTRAINT PK_payment_transactions        PRIMARY KEY (id),
    CONSTRAINT FK_payment_transactions_inv    FOREIGN KEY (invoice_id)        REFERENCES invoices(id),
    CONSTRAINT FK_payment_transactions_method FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
);

-- ============================================================
-- 19. pillar_results  (no FK)
-- ============================================================
CREATE TABLE pillar_results (
    id           UUID        NOT NULL DEFAULT gen_random_uuid(),
    pillar_no    SMALLINT    NOT NULL,
    score        SMALLINT    NULL,
    findings     TEXT        NULL,
    sources_used TEXT        NULL,
    latency_ms   INT         NULL,
    CONSTRAINT PK_pillar_results PRIMARY KEY (id)
);

-- ============================================================
-- 20. quota_topups  (FK -> users, payment_transactions)
-- ============================================================
CREATE TABLE quota_topups (
    id             UUID            NOT NULL DEFAULT gen_random_uuid(),
    user_id        UUID            NOT NULL,
    transaction_id UUID            NULL,
    quota_added    INT             NOT NULL,
    price_vnd      NUMERIC(18,0)   NOT NULL,
    status         VARCHAR(20)     NOT NULL DEFAULT 'pending',
    created_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT PK_quota_topups             PRIMARY KEY (id),
    CONSTRAINT FK_quota_topups_user        FOREIGN KEY (user_id)        REFERENCES users(id),
    CONSTRAINT FK_quota_topups_transaction FOREIGN KEY (transaction_id) REFERENCES payment_transactions(id)
);

-- ============================================================
-- 21. recommendations  (FK -> deal_analyses)
-- ============================================================
CREATE TABLE recommendations (
    id          UUID        NOT NULL DEFAULT gen_random_uuid(),
    analysis_id UUID        NOT NULL,
    rec_type    VARCHAR(20) NOT NULL,
    content     TEXT        NOT NULL,
    priority    SMALLINT    NOT NULL DEFAULT 1,
    CONSTRAINT PK_recommendations          PRIMARY KEY (id),
    CONSTRAINT FK_recommendations_analysis FOREIGN KEY (analysis_id) REFERENCES deal_analyses(id)
);

-- ============================================================
-- 22. refunds  (FK -> payment_transactions, users)
-- ============================================================
CREATE TABLE refunds (
    id             UUID            NOT NULL DEFAULT gen_random_uuid(),
    transaction_id UUID            NOT NULL,
    requested_by   UUID            NOT NULL,
    amount_vnd     NUMERIC(18,0)   NOT NULL,
    reason         VARCHAR(500)    NOT NULL,
    status         VARCHAR(20)     NOT NULL DEFAULT 'pending',
    provider_ref   VARCHAR(255)    NULL,
    created_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    completed_at   TIMESTAMPTZ     NULL,
    CONSTRAINT PK_refunds             PRIMARY KEY (id),
    CONSTRAINT FK_refunds_transaction FOREIGN KEY (transaction_id) REFERENCES payment_transactions(id),
    CONSTRAINT FK_refunds_user        FOREIGN KEY (requested_by)   REFERENCES users(id)
);

-- ============================================================
-- 23. reports  (FK -> users)
-- ============================================================
CREATE TABLE reports (
    id            UUID            NOT NULL DEFAULT gen_random_uuid(),
    user_id       UUID            NOT NULL,
    entity_name   VARCHAR(500)    NOT NULL,
    country_iso2  VARCHAR(2)      NULL,
    tier          VARCHAR(20)     NOT NULL DEFAULT 'standard',
    overall_score SMALLINT        NULL,
    hard_stop     BOOLEAN         NOT NULL DEFAULT FALSE,
    raw_data      TEXT            NULL,
    created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ     NULL,
    CONSTRAINT PK_reports      PRIMARY KEY (id),
    CONSTRAINT FK_reports_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- 24. report_jobs  (no FK in model)
-- ============================================================
CREATE TABLE report_jobs (
    id             UUID        NOT NULL DEFAULT gen_random_uuid(),
    status         VARCHAR(20) NOT NULL DEFAULT 'queued',
    current_pillar SMALLINT    NULL,
    attempt_count  INT         NOT NULL DEFAULT 0,
    error_message  TEXT        NULL,
    started_at     TIMESTAMPTZ NULL,
    completed_at   TIMESTAMPTZ NULL,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT PK_report_jobs PRIMARY KEY (id)
);

-- ============================================================
-- 25. report_shares  (FK -> users)
-- ============================================================
CREATE TABLE report_shares (
    id                UUID            NOT NULL DEFAULT gen_random_uuid(),
    created_by        UUID            NOT NULL,
    share_token       VARCHAR(100)    NOT NULL,
    requires_password BOOLEAN         NOT NULL DEFAULT FALSE,
    password_hash     VARCHAR(255)    NULL,
    expires_at        TIMESTAMPTZ     NULL,
    created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT PK_report_shares      PRIMARY KEY (id),
    CONSTRAINT FK_report_shares_user FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================================
-- 26. scoring_configs  (FK -> plans)
-- ============================================================
CREATE TABLE scoring_configs (
    id             UUID        NOT NULL DEFAULT gen_random_uuid(),
    plan_id        INT         NOT NULL,
    config_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    pillar_weights TEXT        NOT NULL,
    thresholds     TEXT        NOT NULL,
    is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT PK_scoring_configs      PRIMARY KEY (id),
    CONSTRAINT FK_scoring_configs_plan FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- ============================================================
-- 27. system_alerts  (FK -> users, nullable)
-- ============================================================
CREATE TABLE system_alerts (
    id          UUID            NOT NULL DEFAULT gen_random_uuid(),
    user_id     UUID            NULL,
    alert_type  VARCHAR(100)    NOT NULL,
    severity    VARCHAR(10)     NOT NULL,
    message     TEXT            NOT NULL,
    is_resolved BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ     NULL,
    CONSTRAINT PK_system_alerts      PRIMARY KEY (id),
    CONSTRAINT FK_system_alerts_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- 28. tineye_results  (OneToOne FK -> image_assets)
-- ============================================================
CREATE TABLE tineye_results (
    id          UUID    NOT NULL DEFAULT gen_random_uuid(),
    asset_id    UUID    NOT NULL,
    match_count INT     NOT NULL DEFAULT 0,
    matches     TEXT    NULL,
    CONSTRAINT PK_tineye_results       PRIMARY KEY (id),
    CONSTRAINT UQ_tineye_results_asset UNIQUE      (asset_id),
    CONSTRAINT FK_tineye_results_asset FOREIGN KEY (asset_id) REFERENCES image_assets(id)
);

-- ============================================================
-- 29. usage_snapshots  (FK -> users)
-- ============================================================
CREATE TABLE usage_snapshots (
    id                UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id           UUID        NOT NULL,
    period_type       VARCHAR(10) NOT NULL,
    period_start      TIMESTAMPTZ NOT NULL,
    period_end        TIMESTAMPTZ NOT NULL,
    reports_generated INT         NOT NULL DEFAULT 0,
    quota_consumed    INT         NOT NULL DEFAULT 0,
    api_calls         INT         NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT PK_usage_snapshots      PRIMARY KEY (id),
    CONSTRAINT FK_usage_snapshots_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- 30. vietqr_payments  (FK -> invoices)
-- ============================================================
CREATE TABLE vietqr_payments (
    id                  UUID            NOT NULL DEFAULT gen_random_uuid(),
    invoice_id          UUID            NOT NULL,
    bank_code           VARCHAR(10)     NOT NULL,
    account_no          VARCHAR(50)     NOT NULL,
    transfer_content    VARCHAR(50)     NOT NULL,
    expected_amount_vnd NUMERIC(18,0)   NOT NULL,
    qr_data_url         TEXT            NULL,
    status              VARCHAR(20)     NOT NULL DEFAULT 'pending',
    matched_ref         VARCHAR(255)    NULL,
    expires_at          TIMESTAMPTZ     NOT NULL,
    matched_at          TIMESTAMPTZ     NULL,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT PK_vietqr_payments         PRIMARY KEY (id),
    CONSTRAINT FK_vietqr_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

-- ============================================================
-- 31. vision_analyses  (OneToOne FK -> image_assets)
-- ============================================================
CREATE TABLE vision_analyses (
    id          UUID    NOT NULL DEFAULT gen_random_uuid(),
    asset_id    UUID    NOT NULL,
    ai_analysis TEXT    NULL,
    CONSTRAINT PK_vision_analyses       PRIMARY KEY (id),
    CONSTRAINT UQ_vision_analyses_asset UNIQUE      (asset_id),
    CONSTRAINT FK_vision_analyses_asset FOREIGN KEY (asset_id) REFERENCES image_assets(id)
);

-- ============================================================
-- 32. webhook_configs  (FK -> users)
-- ============================================================
CREATE TABLE webhook_configs (
    id          UUID            NOT NULL DEFAULT gen_random_uuid(),
    user_id     UUID            NOT NULL,
    url         VARCHAR(500)    NOT NULL,
    secret_hash VARCHAR(255)    NOT NULL,
    event_types TEXT            NOT NULL,
    is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT PK_webhook_configs      PRIMARY KEY (id),
    CONSTRAINT FK_webhook_configs_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- 33. webhook_deliveries  (FK -> webhook_configs)
-- ============================================================
CREATE TABLE webhook_deliveries (
    id            UUID            NOT NULL DEFAULT gen_random_uuid(),
    webhook_id    UUID            NOT NULL,
    event_type    VARCHAR(100)    NOT NULL,
    http_status   INT             NULL,
    error         TEXT            NULL,
    attempt_count INT             NOT NULL DEFAULT 0,
    delivered_at  TIMESTAMPTZ     NULL,
    CONSTRAINT PK_webhook_deliveries         PRIMARY KEY (id),
    CONSTRAINT FK_webhook_deliveries_webhook FOREIGN KEY (webhook_id) REFERENCES webhook_configs(id)
);

-- ============================================================
-- Seed: default plans
-- ============================================================
INSERT INTO plans (name, billing_cycle, price_usd, price_vnd, monthly_quota, features, is_active)
VALUES
    ('Free',       'monthly',  0.00,  0,       5,   '["basic_reports"]',                                          TRUE),
    ('Starter',    'monthly',  9.99,  249000,  30,  '["basic_reports","email_support"]',                          TRUE),
    ('Pro',        'monthly', 29.99,  749000,  100, '["all_reports","priority_support","api"]',                   TRUE),
    ('Enterprise', 'monthly', 99.99, 2490000,  500, '["all_reports","dedicated_support","api","webhooks"]',       TRUE);

\echo 'MarketScout PostgreSQL database created successfully.'
