-- ─────────────────────────────────────────────────────────────────────
-- Template để seed tài khoản admin cho MỘT môi trường cụ thể.
--
-- Đây là TEMPLATE — không chứa giá trị thật và không được chạy trực tiếp.
-- Khối này từng nằm trong baseline schema với 5 email cá nhân thật kèm
-- BCrypt hash; repository là public nên đã được tách ra khỏi đó.
--
-- CÁCH DÙNG:
--   cp seed_admins.example.sql seed_admins.local.sql   # .local.sql bị gitignore
--   # điền email + hash thật vào bản .local.sql, rồi:
--   psql "$DB_URL" -f seed_admins.local.sql
--
-- Sinh hash BCrypt (cost 10, khớp BCryptPasswordEncoder của Spring):
--   htpasswd -bnBC 10 "" 'mat-khau-cua-ban' | tr -d ':\n'
--
-- Đặt mật khẩu mạnh và ngẫu nhiên, lưu trong password manager. Hash cost 10
-- bị lộ là có thể brute-force offline, nên đừng đưa bản .local.sql lên git.
-- ─────────────────────────────────────────────────────────────────────

INSERT INTO users (
    email, password_hash, full_name, role, plan_id,
    quota_remaining, quota_used_this_cycle, cycle_reset_at,
    is_active, email_verified
)
SELECT v.email, v.password_hash, v.full_name, 'admin',
       (SELECT id FROM plans WHERE name = 'Enterprise'),
       (SELECT monthly_quota FROM plans WHERE name = 'Enterprise'),
       0, NOW() + INTERVAL '1 month',
       TRUE, TRUE
FROM (VALUES
    ('admin1@example.invalid', '$2b$10$REPLACE_WITH_YOUR_OWN_BCRYPT_HASH_______________________', 'MarketScout Admin 1'),
    ('admin2@example.invalid', '$2b$10$REPLACE_WITH_YOUR_OWN_BCRYPT_HASH_______________________', 'MarketScout Admin 2')
) AS v(email, password_hash, full_name)
ON CONFLICT (email) DO NOTHING;
