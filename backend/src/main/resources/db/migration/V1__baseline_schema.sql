-- ============================================================
-- MarketScout — PRODUCTION Database Setup Script (v4, consolidated)
-- ============================================================
-- Mục đích
--   File SQL DUY NHẤT để khởi tạo toàn bộ schema PostgreSQL cho
--   MarketScout trên PRODUCTION. Gộp từ:
--     1. create_database_postgres.sql (v1 — đã bị xoá khỏi repo, 33 bảng gốc)
--     2. migrate_v3.sql (v2 → v3 — Find Partners / Quick Scan / Deep Verify:
--        reports.status/website/tax_id/lei/source/quick_scan_done/risk_level,
--        pillar_results.evidences/status/confidence/pillar_name,
--        entity_cache.country_iso2/data_source, scoring_configs v2.0 weights)
--     3. Drift phát sinh sau v3 (đã đối chiếu trực tiếp với JPA entity hiện tại):
--        - chat_sessions: thêm created_at
--        - chat_messages: thiết kế lại — session_id, user_id, model_used, metadata (jsonb)
--        - model_run_logs: thêm user_id, session_id, report_id, provider, prompt_text
--     4. Production hardening: UNIQUE constraint (email, share_token, ...),
--        CHECK constraint cho các cột dạng enum đã xác nhận trong code,
--        index cho mọi FK + các truy vấn nóng (ChatSessionRepository,
--        ReportRepository, PillarResultRepository, ...), partial index.
--     5. Seed dữ liệu mặc định: 4 gói plans, scoring_configs v2.0 (đúng
--        trọng số 8 pillar theo doc), và 5 tài khoản admin.
--     6. Contract verification feature (P7): thêm plan_purchases (bảng đã
--        tồn tại trong code/payment_tables.sql nhưng bị thiếu ở file này),
--        contracts + assessment_contract_links (thư viện hợp đồng + liên
--        kết xác minh theo từng lần thẩm định), và 5 cột mới trên reports
--        (self_report_* — tham khảo, weight=0; p7_verified_contract_id —
--        cột duy nhất thực sự ảnh hưởng điểm P7). Toàn bộ 33 bảng gốc (1-33)
--        đã được đối chiếu lại với JPA entity hiện tại và xác nhận khớp,
--        không có thay đổi nào khác ngoài phần bổ sung này. Seed INSERT
--        (plans, scoring_configs, admin users) giữ nguyên không đổi.
--
-- Lỗi gốc cần fix
--   "ERROR: relation reports does not exist" — DB production đang TRỐNG
--   (create_database_postgres.sql đã bị xoá nên chưa có bảng nào được tạo,
--   migrate_v3.sql chỉ có ALTER TABLE nên fail ngay từ statement đầu tiên).
--   File này tạo lại toàn bộ 33 bảng từ đầu, đã bao gồm sẵn mọi thay đổi
--   của v3 — KHÔNG cần chạy migrate_v3.sql nữa.
--
-- Idempotent
--   An toàn khi chạy lại nhiều lần:
--     - CREATE TABLE IF NOT EXISTS
--     - CREATE INDEX IF NOT EXISTS
--     - INSERT ... ON CONFLICT DO NOTHING / DO UPDATE
--   Lưu ý: nếu bảng ĐÃ TỒN TẠI với schema v1 cũ (thiếu cột v3), CREATE TABLE
--   IF NOT EXISTS sẽ KHÔNG thêm cột mới. Phần "9. ADDITIVE migration cho DB
--   v1/v2 cũ" ở cuối file xử lý case đó bằng ALTER TABLE ... ADD COLUMN
--   IF NOT EXISTS (giống cơ chế migrate_v3.sql).
--
-- Yêu cầu: PostgreSQL 13+
--
-- Cách chạy (production)
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database_production_v4.sql
--
-- Toàn bộ chạy trong 1 transaction — lỗi ở bất kỳ đâu thì KHÔNG có gì
-- được ghi vào DB (rollback toàn bộ).
--
-- BEGIN/COMMIT tường minh đã được BỎ khi chuyển sang Flyway: Flyway tự bọc
-- mỗi migration trong một transaction riêng, nên BEGIN lồng nhau sẽ cảnh báo
-- và COMMIT giữa file sẽ commit sớm transaction của Flyway, làm mất luôn khả
-- năng rollback. Tính nguyên tử vẫn được giữ, chỉ là do Flyway quản lý.
-- ============================================================

-- gen_random_uuid() có sẵn từ PostgreSQL 13 (module pgcrypto).
-- Một số managed Postgres không cho phép CREATE EXTENSION với role
-- thường — nếu lệnh dưới đây báo lỗi quyền hạn và PG >= 13, có thể
-- comment dòng này lại vì gen_random_uuid() đã nằm trong core.
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 1. plans  (không phụ thuộc bảng nào)
-- ============================================================
CREATE TABLE IF NOT EXISTS plans (
    id              SERIAL          NOT NULL,
    name            VARCHAR(50)     NOT NULL,
    billing_cycle   VARCHAR(20)     NOT NULL DEFAULT 'monthly',
    price_usd       NUMERIC(18,2)   NULL,
    price_vnd       NUMERIC(18,0)   NULL,
    monthly_quota   INT             NOT NULL,
    features        TEXT            NULL,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_plans PRIMARY KEY (id),
    CONSTRAINT uq_plans_name UNIQUE (name)
);

-- ============================================================
-- 2. users  (FK -> plans)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
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
    CONSTRAINT pk_users PRIMARY KEY (id),
    CONSTRAINT fk_users_plan FOREIGN KEY (plan_id) REFERENCES plans(id),
    -- findByEmail/existsByEmail (UsersRepository) + login đều dựa vào email duy nhất
    CONSTRAINT uq_users_email UNIQUE (email),
    -- SecurityConfig: userDetailsService dùng .roles(role.toUpperCase())
    -- và hasRole("ADMIN") -> chỉ 2 giá trị hợp lệ
    CONSTRAINT chk_users_role CHECK (role IN ('user','admin'))
);

-- ============================================================
-- 3. reports  (FK -> users)  — đã bao gồm các cột v3
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
    id              UUID            NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL,
    entity_name     VARCHAR(500)    NOT NULL,
    country_iso2    VARCHAR(2)      NULL,
    tier            VARCHAR(20)     NOT NULL DEFAULT 'standard',
    overall_score   SMALLINT        NULL,
    hard_stop       BOOLEAN         NOT NULL DEFAULT FALSE,
    raw_data        TEXT            NULL,

    -- v3: trạng thái pipeline — PENDING | QUICK_SCANNING | DEEP_SCANNING | DONE | HARD_STOP | FAILED
    status          VARCHAR(20)     NOT NULL DEFAULT 'PENDING',
    -- v3: website công ty (từ Tavily leads hoặc user nhập)
    website         VARCHAR(300)    NULL,
    -- v3: MST nếu là công ty VN
    tax_id          VARCHAR(50)     NULL,
    -- v3: LEI nếu là công ty quốc tế (GLEIF)
    lei             VARCHAR(50)     NULL,
    -- v3: nguồn tạo report — FIND_PARTNERS | MANUAL | COMPARE
    source          VARCHAR(20)     NOT NULL DEFAULT 'MANUAL',
    -- v3: TRUE khi P1 + P6 quick scan đã chạy xong
    quick_scan_done BOOLEAN         NOT NULL DEFAULT FALSE,
    -- v3: Thấp | Trung bình | Cao | Nghiêm trọng
    risk_level      VARCHAR(20)     NULL,

    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NULL,
    CONSTRAINT pk_reports PRIMARY KEY (id),
    CONSTRAINT fk_reports_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT chk_reports_status CHECK (status IN ('PENDING','QUICK_SCANNING','DEEP_SCANNING','DONE','HARD_STOP','FAILED')),
    CONSTRAINT chk_reports_source CHECK (source IN ('FIND_PARTNERS','MANUAL','COMPARE')),
    CONSTRAINT chk_reports_overall_score CHECK (overall_score IS NULL OR overall_score BETWEEN 0 AND 100)
);

-- ============================================================
-- 4. chat_sessions  (FK -> users)
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
    id         UUID            NOT NULL DEFAULT gen_random_uuid(),
    user_id    UUID            NOT NULL,
    title      VARCHAR(300)    NULL,
    created_at TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_chat_sessions PRIMARY KEY (id),
    CONSTRAINT fk_chat_sessions_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- 5. chat_messages  (FK -> chat_sessions, users) — schema mới
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id         UUID            NOT NULL DEFAULT gen_random_uuid(),
    session_id UUID            NOT NULL,
    user_id    UUID            NOT NULL,
    role       VARCHAR(20)     NOT NULL,
    content    TEXT            NOT NULL,
    model_used VARCHAR(100)    NULL,
    -- format chuẩn: { intent, report_id, leads_cache_key, quick_scan_ids[] }
    metadata   JSONB           NULL,
    created_at TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_chat_messages PRIMARY KEY (id),
    CONSTRAINT fk_chat_messages_session FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_messages_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT chk_chat_messages_role CHECK (role IN ('user','assistant'))
);

-- ============================================================
-- 6. subscriptions  (FK -> users, plans)
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
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
    CONSTRAINT pk_subscriptions PRIMARY KEY (id),
    CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- ============================================================
-- 7. api_tokens  (FK -> users)
-- ============================================================
CREATE TABLE IF NOT EXISTS api_tokens (
    id           UUID            NOT NULL DEFAULT gen_random_uuid(),
    user_id      UUID            NOT NULL,
    token_hash   VARCHAR(255)    NOT NULL,
    label        VARCHAR(100)    NULL,
    last_used_at TIMESTAMPTZ     NULL,
    expires_at   TIMESTAMPTZ     NULL,
    created_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_api_tokens PRIMARY KEY (id),
    CONSTRAINT fk_api_tokens_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT uq_api_tokens_hash UNIQUE (token_hash)
);

-- ============================================================
-- 8. audit_logs  (FK -> users, nullable)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID            NOT NULL DEFAULT gen_random_uuid(),
    actor_id    UUID            NULL,
    "action"    VARCHAR(100)    NOT NULL,
    target_type VARCHAR(50)     NULL,
    target_id   UUID            NULL,
    payload     TEXT            NULL,
    ip_address  VARCHAR(45)     NULL,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_audit_logs PRIMARY KEY (id),
    -- Giữ lại audit log kể cả khi tài khoản actor bị xoá
    CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- 9. billing_events  (FK -> users)
-- ============================================================
CREATE TABLE IF NOT EXISTS billing_events (
    id         UUID            NOT NULL DEFAULT gen_random_uuid(),
    user_id    UUID            NOT NULL,
    event_type VARCHAR(100)    NOT NULL,
    payload    TEXT            NULL,
    created_at TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_billing_events PRIMARY KEY (id),
    CONSTRAINT fk_billing_events_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- 10. deal_analyses  (không FK)
-- ============================================================
CREATE TABLE IF NOT EXISTS deal_analyses (
    id                   UUID            NOT NULL DEFAULT gen_random_uuid(),
    recommended_incoterm VARCHAR(10)     NULL,
    payment_method       VARCHAR(10)     NULL,
    risk_factors         TEXT            NULL,
    CONSTRAINT pk_deal_analyses PRIMARY KEY (id)
);

-- ============================================================
-- 11. recommendations  (FK -> deal_analyses)
-- ============================================================
CREATE TABLE IF NOT EXISTS recommendations (
    id          UUID        NOT NULL DEFAULT gen_random_uuid(),
    analysis_id UUID        NOT NULL,
    rec_type    VARCHAR(20) NOT NULL,
    content     TEXT        NOT NULL,
    priority    SMALLINT    NOT NULL DEFAULT 1,
    CONSTRAINT pk_recommendations PRIMARY KEY (id),
    CONSTRAINT fk_recommendations_analysis FOREIGN KEY (analysis_id) REFERENCES deal_analyses(id) ON DELETE CASCADE
);

-- ============================================================
-- 12. embeddings  (không FK)
-- ============================================================
CREATE TABLE IF NOT EXISTS embeddings (
    id        UUID    NOT NULL DEFAULT gen_random_uuid(),
    embedding BYTEA   NULL,
    CONSTRAINT pk_embeddings PRIMARY KEY (id)
);

-- ============================================================
-- 13. entity_cache  (không FK, PK dạng string) — đã bao gồm cột v3
-- ============================================================
CREATE TABLE IF NOT EXISTS entity_cache (
    cache_key    VARCHAR(450)   NOT NULL,
    pillar_no    SMALLINT       NOT NULL,
    cached_data  TEXT           NOT NULL,
    expires_at   TIMESTAMPTZ    NOT NULL,
    -- v3: VN | JP | US ... để phân biệt cache VN vs quốc tế
    country_iso2 VARCHAR(2)     NULL,
    -- v3: vietqr | gleif | opensanctions | masothue | tavily
    data_source  VARCHAR(50)    NULL,
    CONSTRAINT pk_entity_cache PRIMARY KEY (cache_key),
    CONSTRAINT chk_entity_cache_pillar_no CHECK (pillar_no BETWEEN 1 AND 8)
);

-- ============================================================
-- 14. image_assets  (không FK)
-- ============================================================
CREATE TABLE IF NOT EXISTS image_assets (
    id        UUID            NOT NULL DEFAULT gen_random_uuid(),
    minio_key VARCHAR(500)    NOT NULL,
    status    VARCHAR(20)     NOT NULL DEFAULT 'uploaded',
    file_size BIGINT          NULL,
    CONSTRAINT pk_image_assets PRIMARY KEY (id)
);

-- ============================================================
-- 15. tineye_results  (OneToOne FK -> image_assets)
-- ============================================================
CREATE TABLE IF NOT EXISTS tineye_results (
    id          UUID    NOT NULL DEFAULT gen_random_uuid(),
    asset_id    UUID    NOT NULL,
    match_count INT     NOT NULL DEFAULT 0,
    matches     TEXT    NULL,
    CONSTRAINT pk_tineye_results PRIMARY KEY (id),
    CONSTRAINT uq_tineye_results_asset UNIQUE (asset_id),
    CONSTRAINT fk_tineye_results_asset FOREIGN KEY (asset_id) REFERENCES image_assets(id) ON DELETE CASCADE
);

-- ============================================================
-- 16. vision_analyses  (OneToOne FK -> image_assets)
-- ============================================================
CREATE TABLE IF NOT EXISTS vision_analyses (
    id          UUID    NOT NULL DEFAULT gen_random_uuid(),
    asset_id    UUID    NOT NULL,
    ai_analysis TEXT    NULL,
    CONSTRAINT pk_vision_analyses PRIMARY KEY (id),
    CONSTRAINT uq_vision_analyses_asset UNIQUE (asset_id),
    CONSTRAINT fk_vision_analyses_asset FOREIGN KEY (asset_id) REFERENCES image_assets(id) ON DELETE CASCADE
);

-- ============================================================
-- 17. invoices  (FK -> users)
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
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
    CONSTRAINT pk_invoices PRIMARY KEY (id),
    CONSTRAINT fk_invoices_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT uq_invoices_invoice_no UNIQUE (invoice_no)
);

-- ============================================================
-- 18. payment_methods  (FK -> users)
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_methods (
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
    CONSTRAINT pk_payment_methods PRIMARY KEY (id),
    CONSTRAINT fk_payment_methods_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- 19. payment_transactions  (FK -> invoices, payment_methods)
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
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
    CONSTRAINT pk_payment_transactions PRIMARY KEY (id),
    CONSTRAINT fk_payment_transactions_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    CONSTRAINT fk_payment_transactions_method FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL
);

-- ============================================================
-- 20. vietqr_payments  (FK -> invoices)
-- ============================================================
CREATE TABLE IF NOT EXISTS vietqr_payments (
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
    CONSTRAINT pk_vietqr_payments PRIMARY KEY (id),
    CONSTRAINT fk_vietqr_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

-- ============================================================
-- 21. quota_topups  (FK -> users, payment_transactions)
-- ============================================================
CREATE TABLE IF NOT EXISTS quota_topups (
    id             UUID            NOT NULL DEFAULT gen_random_uuid(),
    user_id        UUID            NOT NULL,
    transaction_id UUID            NULL,
    quota_added    INT             NOT NULL,
    price_vnd      NUMERIC(18,0)   NOT NULL,
    status         VARCHAR(20)     NOT NULL DEFAULT 'pending',
    created_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_quota_topups PRIMARY KEY (id),
    CONSTRAINT fk_quota_topups_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_quota_topups_transaction FOREIGN KEY (transaction_id) REFERENCES payment_transactions(id) ON DELETE SET NULL
);

-- ============================================================
-- 22. refunds  (FK -> payment_transactions, users)
-- ============================================================
CREATE TABLE IF NOT EXISTS refunds (
    id             UUID            NOT NULL DEFAULT gen_random_uuid(),
    transaction_id UUID            NOT NULL,
    requested_by   UUID            NOT NULL,
    amount_vnd     NUMERIC(18,0)   NOT NULL,
    reason         VARCHAR(500)    NOT NULL,
    status         VARCHAR(20)     NOT NULL DEFAULT 'pending',
    provider_ref   VARCHAR(255)    NULL,
    created_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    completed_at   TIMESTAMPTZ     NULL,
    CONSTRAINT pk_refunds PRIMARY KEY (id),
    CONSTRAINT fk_refunds_transaction FOREIGN KEY (transaction_id) REFERENCES payment_transactions(id),
    CONSTRAINT fk_refunds_user FOREIGN KEY (requested_by) REFERENCES users(id)
);

-- ============================================================
-- 23. long_term_memory  (FK -> users)
-- ============================================================
CREATE TABLE IF NOT EXISTS long_term_memory (
    id         UUID            NOT NULL DEFAULT gen_random_uuid(),
    user_id    UUID            NOT NULL,
    memory_key VARCHAR(100)    NOT NULL,
    content    TEXT            NOT NULL,
    updated_at TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_long_term_memory PRIMARY KEY (id),
    CONSTRAINT fk_long_term_memory_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT uq_long_term_memory_user_key UNIQUE (user_id, memory_key)
);

-- ============================================================
-- 24. model_run_logs  (FK -> users, chat_sessions, reports — tất cả nullable)
-- ============================================================
CREATE TABLE IF NOT EXISTS model_run_logs (
    id            UUID            NOT NULL DEFAULT gen_random_uuid(),
    user_id       UUID            NULL,
    session_id    UUID            NULL,
    report_id     UUID            NULL,
    model_name    VARCHAR(100)    NOT NULL,
    model_version VARCHAR(50)     NULL,
    -- mặc định 'gemini', đồng bộ với @PrePersist trong ModelRunLog.java
    provider      VARCHAR(50)     NOT NULL DEFAULT 'gemini',
    input_tokens  INT             NULL,
    output_tokens INT             NULL,
    latency_ms    INT             NULL,
    cost_usd      NUMERIC(18,6)   NULL DEFAULT 0,
    prompt_text   TEXT            NULL,
    created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_model_run_logs PRIMARY KEY (id),
    CONSTRAINT fk_model_run_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_model_run_logs_session FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE SET NULL,
    CONSTRAINT fk_model_run_logs_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE SET NULL
);

-- ============================================================
-- 25. notifications  (FK -> users)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id         UUID            NOT NULL DEFAULT gen_random_uuid(),
    user_id    UUID            NOT NULL,
    type       VARCHAR(50)     NOT NULL,
    title      VARCHAR(200)    NOT NULL,
    body       TEXT            NULL,
    payload    TEXT            NULL,
    is_read    BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_notifications PRIMARY KEY (id),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- 26. pillar_results  (FK -> reports) — đã bao gồm cột v3
-- ============================================================
CREATE TABLE IF NOT EXISTS pillar_results (
    id           UUID        NOT NULL DEFAULT gen_random_uuid(),
    report_id    UUID        NOT NULL,
    pillar_no    SMALLINT    NOT NULL,
    score        SMALLINT    NULL,
    findings     TEXT        NULL,
    sources_used TEXT        NULL,
    latency_ms   INT         NULL,

    -- v3: mảng { type: PASS|WARN|FAIL, text, source } — map 1:1 Figma evidence items
    evidences    JSONB       NULL,
    -- v3: PASS (>=75) | WARN (40-74) | FAIL (<40) | SKIP (thiếu data)
    status       VARCHAR(10) NULL,
    -- v3: HIGH (API thật) | MEDIUM (scrape) | LOW (Tavily only)
    confidence   VARCHAR(10) NULL,
    -- v3: tên pillar denormalize cho FE render
    pillar_name  VARCHAR(50) NULL,

    CONSTRAINT pk_pillar_results PRIMARY KEY (id),
    CONSTRAINT fk_pillar_results_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    CONSTRAINT chk_pillar_results_pillar_no CHECK (pillar_no BETWEEN 1 AND 8),
    CONSTRAINT chk_pillar_results_score CHECK (score IS NULL OR score BETWEEN 0 AND 100),
    CONSTRAINT chk_pillar_results_status CHECK (status IS NULL OR status IN ('PASS','WARN','FAIL','SKIP')),
    CONSTRAINT chk_pillar_results_confidence CHECK (confidence IS NULL OR confidence IN ('HIGH','MEDIUM','LOW')),
    -- ScoringEngine.savePillarResults() xoá hết pillar_results cũ của report
    -- trước khi insert lại đủ 8 pillar -> mỗi report chỉ có 1 row / pillar_no
    CONSTRAINT uq_pillar_results_report_pillar UNIQUE (report_id, pillar_no)
);

-- ============================================================
-- 27. report_jobs  (không FK trong model)
-- ============================================================
CREATE TABLE IF NOT EXISTS report_jobs (
    id             UUID        NOT NULL DEFAULT gen_random_uuid(),
    status         VARCHAR(20) NOT NULL DEFAULT 'queued',
    current_pillar SMALLINT    NULL,
    attempt_count  INT         NOT NULL DEFAULT 0,
    error_message  TEXT        NULL,
    started_at     TIMESTAMPTZ NULL,
    completed_at   TIMESTAMPTZ NULL,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_report_jobs PRIMARY KEY (id),
    CONSTRAINT chk_report_jobs_current_pillar CHECK (current_pillar IS NULL OR current_pillar BETWEEN 1 AND 8)
);

-- ============================================================
-- 28. report_shares  (FK -> users)
-- ============================================================
CREATE TABLE IF NOT EXISTS report_shares (
    id                UUID            NOT NULL DEFAULT gen_random_uuid(),
    created_by        UUID            NOT NULL,
    share_token       VARCHAR(100)    NOT NULL,
    requires_password BOOLEAN         NOT NULL DEFAULT FALSE,
    password_hash     VARCHAR(255)    NULL,
    expires_at        TIMESTAMPTZ     NULL,
    created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_report_shares PRIMARY KEY (id),
    CONSTRAINT fk_report_shares_user FOREIGN KEY (created_by) REFERENCES users(id),
    -- share_token dùng để tra cứu link public -> phải duy nhất
    CONSTRAINT uq_report_shares_token UNIQUE (share_token)
);

-- ============================================================
-- 29. scoring_configs  (FK -> plans)
-- ============================================================
CREATE TABLE IF NOT EXISTS scoring_configs (
    id             UUID        NOT NULL DEFAULT gen_random_uuid(),
    plan_id        INT         NOT NULL,
    config_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    pillar_weights TEXT        NOT NULL,
    thresholds     TEXT        NOT NULL,
    is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_scoring_configs PRIMARY KEY (id),
    CONSTRAINT fk_scoring_configs_plan FOREIGN KEY (plan_id) REFERENCES plans(id),
    CONSTRAINT uq_scoring_configs_plan_version UNIQUE (plan_id, config_version)
);

-- ============================================================
-- 30. system_alerts  (FK -> users, nullable)
-- ============================================================
CREATE TABLE IF NOT EXISTS system_alerts (
    id          UUID            NOT NULL DEFAULT gen_random_uuid(),
    user_id     UUID            NULL,
    alert_type  VARCHAR(100)    NOT NULL,
    severity    VARCHAR(10)     NOT NULL,
    message     TEXT            NOT NULL,
    is_resolved BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ     NULL,
    CONSTRAINT pk_system_alerts PRIMARY KEY (id),
    CONSTRAINT fk_system_alerts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- 31. usage_snapshots  (FK -> users)
-- ============================================================
CREATE TABLE IF NOT EXISTS usage_snapshots (
    id                UUID        NOT NULL DEFAULT gen_random_uuid(),
    user_id           UUID        NOT NULL,
    period_type       VARCHAR(10) NOT NULL,
    period_start      TIMESTAMPTZ NOT NULL,
    period_end        TIMESTAMPTZ NOT NULL,
    reports_generated INT         NOT NULL DEFAULT 0,
    quota_consumed    INT         NOT NULL DEFAULT 0,
    api_calls         INT         NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_usage_snapshots PRIMARY KEY (id),
    CONSTRAINT fk_usage_snapshots_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- 32. webhook_configs  (FK -> users)
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_configs (
    id          UUID            NOT NULL DEFAULT gen_random_uuid(),
    user_id     UUID            NOT NULL,
    url         VARCHAR(500)    NOT NULL,
    secret_hash VARCHAR(255)    NOT NULL,
    event_types TEXT            NOT NULL,
    is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_webhook_configs PRIMARY KEY (id),
    CONSTRAINT fk_webhook_configs_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- 33. webhook_deliveries  (FK -> webhook_configs)
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id            UUID            NOT NULL DEFAULT gen_random_uuid(),
    webhook_id    UUID            NOT NULL,
    event_type    VARCHAR(100)    NOT NULL,
    http_status   INT             NULL,
    error         TEXT            NULL,
    attempt_count INT             NOT NULL DEFAULT 0,
    delivered_at  TIMESTAMPTZ     NULL,
    CONSTRAINT pk_webhook_deliveries PRIMARY KEY (id),
    CONSTRAINT fk_webhook_deliveries_webhook FOREIGN KEY (webhook_id) REFERENCES webhook_configs(id) ON DELETE CASCADE
);


-- ============================================================
-- 33b. plan_purchases  (FK -> users, payment_transactions, plans)
-- ============================================================
-- Mua gói thuê bao một lần qua VietQR (PlanPurchase.java). Bảng này đã tồn
-- tại trong code và trong backend/src/main/resources/db/payment_tables.sql
-- (tự động chạy khi app khởi động) nhưng trước đây bị THIẾU trong file setup
-- production này — bổ sung tại đây để một DB mới hoàn toàn cũng có đủ bảng.
CREATE TABLE IF NOT EXISTS plan_purchases (
    id             UUID            NOT NULL DEFAULT gen_random_uuid(),
    user_id        UUID            NOT NULL,
    transaction_id UUID            NULL,
    plan_id        INT             NOT NULL,
    billing_cycle  VARCHAR(20)     NULL,
    price_vnd      NUMERIC(18,0)   NOT NULL,
    status         VARCHAR(20)     NOT NULL DEFAULT 'pending',
    created_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_plan_purchases PRIMARY KEY (id),
    CONSTRAINT fk_plan_purchases_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_plan_purchases_transaction FOREIGN KEY (transaction_id) REFERENCES payment_transactions(id) ON DELETE SET NULL,
    CONSTRAINT fk_plan_purchases_plan FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- ============================================================
-- 33c. contracts  (FK -> users) — Thư viện hợp đồng, tái sử dụng được
-- ============================================================
-- "Đã xác minh" là thuộc tính của MỘT LẦN LIÊN KẾT (assessment_contract_links
-- bên dưới), không phải thuộc tính vĩnh viễn của file hợp đồng — cùng một
-- hợp đồng có thể khớp với thẩm định A nhưng không khớp với thẩm định B.
CREATE TABLE IF NOT EXISTS contracts (
    id                UUID            NOT NULL DEFAULT gen_random_uuid(),
    user_id           UUID            NOT NULL,
    file_name         VARCHAR(255)    NOT NULL,
    file_size_bytes   BIGINT          NULL,
    content_type      VARCHAR(100)    NOT NULL,
    -- File hợp đồng gốc (PDF/JPG/PNG, tối đa 10MB) lưu trực tiếp trong
    -- Postgres — không dùng dịch vụ lưu trữ ngoài (không MinIO/S3).
    file_data         BYTEA           NOT NULL,
    uploaded_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    -- Dữ liệu AI trích xuất, mỗi field kèm {value, confidence, sourceText}
    extracted_data    JSONB           NOT NULL DEFAULT '{}',
    extraction_status VARCHAR(20)     NOT NULL DEFAULT 'PENDING',
    created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ     NULL,
    CONSTRAINT pk_contracts PRIMARY KEY (id),
    CONSTRAINT fk_contracts_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT chk_contracts_extraction_status CHECK (extraction_status IN ('PENDING','PROCESSING','COMPLETED','FAILED'))
);

-- ============================================================
-- 33d. assessment_contract_links  (FK -> reports, contracts)
-- ============================================================
-- Liên kết 1 hợp đồng với 1 lần thẩm định (report) và ghi trạng thái xác
-- minh CHỈ CHO LẦN DÙNG NÀY. Liên kết lại (kể cả cùng cặp report/contract,
-- hoặc dùng lại 1 hợp đồng đã "VERIFIED" ở thẩm định khác) luôn chạy lại
-- đối chiếu chéo — không bao giờ tái sử dụng verification_status cũ.
CREATE TABLE IF NOT EXISTS assessment_contract_links (
    id                   UUID        NOT NULL DEFAULT gen_random_uuid(),
    report_id            UUID        NOT NULL,
    contract_id          UUID        NOT NULL,
    verification_status  VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    -- vd: {"signatoryTaxIdMatch": true, "signatoryNameMatch": true, "matchedAgainst": "P1_TAX_ID"}
    match_details        JSONB       NULL,
    -- Sửa tay 1 field sau khi AI trích xuất -> field đó set verified:false
    -- riêng nó, không ảnh hưởng các field khác hay verification_status tổng.
    field_overrides      JSONB       NULL DEFAULT '{}',
    verified_at          TIMESTAMPTZ NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_assessment_contract_links PRIMARY KEY (id),
    CONSTRAINT fk_acl_report FOREIGN KEY (report_id) REFERENCES reports(id),
    CONSTRAINT fk_acl_contract FOREIGN KEY (contract_id) REFERENCES contracts(id),
    CONSTRAINT chk_acl_verification_status CHECK (verification_status IN ('PENDING','VERIFIED','MISMATCH','MANUALLY_EDITED')),
    CONSTRAINT uq_acl_report_contract UNIQUE (report_id, contract_id)
);

-- ============================================================
-- 33e. reports — thêm cột self-report P7 + con trỏ hợp đồng đã xác minh
-- ============================================================
-- ALTER (không phải CREATE) vì bảng reports đã tồn tại từ section 3 phía
-- trên — CREATE TABLE IF NOT EXISTS ở đó sẽ KHÔNG thêm cột mới cho DB
-- production hiện có. Đặt sau khi bảng contracts đã tồn tại vì có FK tới
-- nó. Các cột self_report_* luôn là dữ liệu tham khảo (weight=0), KHÔNG
-- bao giờ được ScoringEngine đọc — chỉ p7_verified_contract_id (được set
-- khi có 1 assessment_contract_links với verification_status=VERIFIED)
-- mới thực sự ảnh hưởng điểm P7.
ALTER TABLE reports ADD COLUMN IF NOT EXISTS self_report_payment_method_safety VARCHAR(10);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS self_report_deposit_percentage SMALLINT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS self_report_deal_value_usd NUMERIC(18,2);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS self_report_has_written_contract BOOLEAN;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS p7_verified_contract_id UUID REFERENCES contracts(id);


-- ============================================================
-- 34. Indexes — FK columns + truy vấn nóng từ các Repository
-- ============================================================

-- users
CREATE INDEX IF NOT EXISTS idx_users_plan_id ON users(plan_id);
CREATE INDEX IF NOT EXISTS idx_users_role   ON users(role);

-- reports — ReportRepository
CREATE INDEX IF NOT EXISTS idx_reports_status      ON reports(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_source      ON reports(user_id, source);
CREATE INDEX IF NOT EXISTS idx_reports_user_created ON reports(user_id, created_at DESC);

-- chat_sessions / chat_messages — ChatSessionRepository / ChatMessageRepository
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user    ON chat_sessions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user    ON chat_messages(user_id);

-- subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan_id);

-- api_tokens
CREATE INDEX IF NOT EXISTS idx_api_tokens_user ON api_tokens(user_id);

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor  ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id);

-- billing_events
CREATE INDEX IF NOT EXISTS idx_billing_events_user ON billing_events(user_id);

-- recommendations
CREATE INDEX IF NOT EXISTS idx_recommendations_analysis ON recommendations(analysis_id);

-- entity_cache — hỗ trợ job dọn cache hết hạn
CREATE INDEX IF NOT EXISTS idx_entity_cache_expires ON entity_cache(expires_at);

-- invoices
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);

-- payment_methods
CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id);

-- payment_transactions
CREATE INDEX IF NOT EXISTS idx_payment_transactions_invoice ON payment_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_method  ON payment_transactions(payment_method_id);

-- vietqr_payments
CREATE INDEX IF NOT EXISTS idx_vietqr_payments_invoice ON vietqr_payments(invoice_id);

-- quota_topups
CREATE INDEX IF NOT EXISTS idx_quota_topups_user        ON quota_topups(user_id);
CREATE INDEX IF NOT EXISTS idx_quota_topups_transaction ON quota_topups(transaction_id);

-- refunds
CREATE INDEX IF NOT EXISTS idx_refunds_transaction  ON refunds(transaction_id);
CREATE INDEX IF NOT EXISTS idx_refunds_requested_by ON refunds(requested_by);

-- model_run_logs
CREATE INDEX IF NOT EXISTS idx_model_run_logs_user    ON model_run_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_model_run_logs_session ON model_run_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_model_run_logs_report  ON model_run_logs(report_id);
CREATE INDEX IF NOT EXISTS idx_model_run_logs_created ON model_run_logs(created_at DESC);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user   ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;

-- pillar_results — PillarResultRepository
CREATE INDEX IF NOT EXISTS idx_pillar_results_status ON pillar_results(report_id, status);

-- report_shares
CREATE INDEX IF NOT EXISTS idx_report_shares_creator ON report_shares(created_by);

-- system_alerts
CREATE INDEX IF NOT EXISTS idx_system_alerts_user       ON system_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_system_alerts_unresolved ON system_alerts(created_at DESC) WHERE is_resolved = FALSE;

-- usage_snapshots
CREATE INDEX IF NOT EXISTS idx_usage_snapshots_user ON usage_snapshots(user_id, period_start DESC);

-- webhook_configs / webhook_deliveries
CREATE INDEX IF NOT EXISTS idx_webhook_configs_user      ON webhook_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);

-- plan_purchases
CREATE INDEX IF NOT EXISTS idx_plan_purchases_user        ON plan_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_purchases_transaction ON plan_purchases(transaction_id);

-- contracts
CREATE INDEX IF NOT EXISTS idx_contracts_user        ON contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_uploaded_at ON contracts(uploaded_at DESC);

-- assessment_contract_links (uq_acl_report_contract above already indexes the pair)
CREATE INDEX IF NOT EXISTS idx_acl_report   ON assessment_contract_links(report_id);
CREATE INDEX IF NOT EXISTS idx_acl_contract ON assessment_contract_links(contract_id);


-- ============================================================
-- 35. Seed: default plans
-- ============================================================
INSERT INTO plans (name, billing_cycle, price_usd, price_vnd, monthly_quota, features, is_active)
VALUES
    ('Free',       'monthly',  0.00,  0,       5,   '["basic_reports"]',                                          TRUE),
    ('Starter',    'monthly',  9.99,  249000,  30,  '["basic_reports","email_support"]',                          TRUE),
    ('Pro',        'monthly', 29.99,  749000,  100, '["all_reports","priority_support","api"]',                   TRUE),
    ('Enterprise', 'monthly', 99.99, 2490000,  500, '["all_reports","dedicated_support","api","webhooks"]',       TRUE)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 36. Seed: scoring_configs v2.0 — đúng trọng số 8 pillar theo doc
--      (P3=18%? -> Doc gốc: P1=18%, P6=18%, đã sửa lại đúng theo migrate_v3)
--      Áp dụng cho mọi plan, idempotent: re-run sẽ ghi đè đúng giá trị.
-- ============================================================
INSERT INTO scoring_configs (plan_id, config_version, pillar_weights, thresholds, is_active)
SELECT
    p.id,
    'v2.0',
    '{
        "p1_entity_validation":    0.18,
        "p2_digital_footprint":    0.10,
        "p3_trade_activity":       0.15,
        "p4_identity_consistency": 0.12,
        "p5_financial_tax":        0.12,
        "p6_payment_bank":         0.18,
        "p7_deal_structure":       0.08,
        "p8_operational_proof":    0.07
    }',
    '{
        "pass":    75,
        "warn":    40,
        "fail":     0,
        "hard_stop_pillar": 6
    }',
    TRUE
FROM plans p
ON CONFLICT (plan_id, config_version) DO UPDATE
SET pillar_weights = EXCLUDED.pillar_weights,
    thresholds     = EXCLUDED.thresholds,
    is_active      = EXCLUDED.is_active;


-- ============================================================
-- 37. Seed tài khoản ADMIN — KHÔNG nằm trong file này
-- ============================================================
-- Trước đây phần này INSERT trực tiếp 5 admin thật: email cá nhân + BCrypt
-- hash (cost 10) của mật khẩu. Repository này PUBLIC (hội đồng cần xem
-- được), nên để nguyên là công khai PII và hash mật khẩu của tài khoản
-- admin trên hệ thống đang chạy — hash cost 10 có thể brute-force offline.
--
-- Seed admin là dữ liệu môi trường, không phải cấu trúc schema, nên nó
-- không thuộc về một migration dùng chung.
--
-- CÁCH SEED ADMIN CHO MÔI TRƯỜNG MỚI:
--   1. cp db/adhoc/seed_admins.example.sql db/adhoc/seed_admins.local.sql
--      (*.local.sql đã bị .gitignore chặn)
--   2. Điền email thật + hash BCrypt tự sinh
--   3. psql "$DB_URL" -f db/adhoc/seed_admins.local.sql
-- ============================================================


-- ============================================================
-- 38. Sanity check sau khi chạy (chạy tay, không thuộc transaction trên)
-- ============================================================
-- SELECT count(*) FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_type = 'BASE TABLE';      -- expect 36

-- SELECT email, role, plan_id, quota_remaining, email_verified
-- FROM users WHERE role = 'admin' ORDER BY email;                   -- expect 5 rows

-- SELECT name, monthly_quota FROM plans ORDER BY id;                -- expect 4 rows

-- SELECT plan_id, config_version, is_active FROM scoring_configs;   -- expect 4 rows (v2.0)

-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'reports' ORDER BY ordinal_position;

-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'pillar_results' ORDER BY ordinal_position;


-- ============================================================
-- 39. ADDITIVE migration cho DB đã có schema v1/v2 cũ (KHÔNG TRỐNG)
-- ============================================================
-- Nếu DB production của bạn ĐÃ tồn tại 4 bảng dưới đây từ trước (v1) nhưng
-- THIẾU các cột v3, các CREATE TABLE IF NOT EXISTS ở trên sẽ bị bỏ qua và
-- bảng sẽ KHÔNG có cột mới. Bỏ comment khối dưới đây và chạy riêng (đã
-- idempotent nhờ ADD COLUMN IF NOT EXISTS) để bổ sung — tương đương nội
-- dung migrate_v3.sql gốc.
--
-- BEGIN;
--
-- ALTER TABLE reports
--     ADD COLUMN IF NOT EXISTS status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
--     ADD COLUMN IF NOT EXISTS website         VARCHAR(300) NULL,
--     ADD COLUMN IF NOT EXISTS tax_id          VARCHAR(50)  NULL,
--     ADD COLUMN IF NOT EXISTS lei             VARCHAR(50)  NULL,
--     ADD COLUMN IF NOT EXISTS source          VARCHAR(20)  NOT NULL DEFAULT 'MANUAL',
--     ADD COLUMN IF NOT EXISTS quick_scan_done BOOLEAN      NOT NULL DEFAULT FALSE,
--     ADD COLUMN IF NOT EXISTS risk_level      VARCHAR(20)  NULL;
--
-- ALTER TABLE pillar_results
--     ADD COLUMN IF NOT EXISTS evidences   JSONB       NULL,
--     ADD COLUMN IF NOT EXISTS status      VARCHAR(10) NULL,
--     ADD COLUMN IF NOT EXISTS confidence  VARCHAR(10) NULL,
--     ADD COLUMN IF NOT EXISTS pillar_name VARCHAR(50) NULL;
--
-- ALTER TABLE entity_cache
--     ADD COLUMN IF NOT EXISTS country_iso2 VARCHAR(2)  NULL,
--     ADD COLUMN IF NOT EXISTS data_source  VARCHAR(50) NULL;
--
-- ALTER TABLE chat_sessions
--     ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
--
-- COMMIT;
--
-- (chat_messages và model_run_logs đổi cấu trúc với cột NOT NULL + FK mới
--  -> nếu bảng cũ đã có dữ liệu, cần backfill thủ công session_id/user_id/
--  provider trước khi ADD COLUMN ... NOT NULL. Với DB rỗng thì không cần
--  quan tâm — CREATE TABLE IF NOT EXISTS ở phần 5 và 24 đã xử lý đúng.)
