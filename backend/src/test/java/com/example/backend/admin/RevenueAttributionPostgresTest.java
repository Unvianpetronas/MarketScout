package com.example.backend.admin;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.backend.domain.PlanPurchaseRepository;
import com.example.backend.domain.QuotaTopupRepository;
import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration;
import org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration;
import org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.TestPropertySource;

/**
 * Revenue must be attributed to what a payment actually bought.
 *
 * <p>The previous query grouped completed transactions by {@code users.plan} —
 * the payer's CURRENT plan. That reported standalone quota top-ups as plan
 * revenue, and an upgrade retroactively moved a customer's entire payment
 * history onto the new plan. This pins the replacement, which is rooted at
 * {@code plan_purchases} / {@code quota_topups} instead.
 *
 * <p>Runs against real PostgreSQL because these are hand-written JPQL queries
 * over real joins; mocks would assert nothing and H2 is not the production
 * database. Needs {@code MARKETSCOUT_TEST_DB_URL} (CI always sets it) and, like
 * the schema test, rebuilds the schema — point it only at a throwaway database.
 */
@SpringBootTest(classes = RevenueAttributionPostgresTest.JpaOnlyConfig.class)
@EnabledIfEnvironmentVariable(named = "MARKETSCOUT_TEST_DB_URL", matches = ".+")
@TestPropertySource(
    properties = {
      "spring.datasource.url=${MARKETSCOUT_TEST_DB_URL}",
      "spring.datasource.username=${MARKETSCOUT_TEST_DB_USER:postgres}",
      "spring.datasource.password=${MARKETSCOUT_TEST_DB_PASSWORD:postgres}",
      "spring.datasource.driver-class-name=org.postgresql.Driver",
      "spring.flyway.enabled=true",
      "spring.flyway.baseline-on-migrate=false",
      "spring.flyway.locations=classpath:db/migration",
      "spring.flyway.clean-disabled=false",
      "spring.sql.init.mode=never",
      // Also proves the entities still match the migrated schema.
      "spring.jpa.hibernate.ddl-auto=validate",
      "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect",
    })
class RevenueAttributionPostgresTest {

  /** DataSource + JPA + Flyway only — the full context needs Redis and Gemini. */
  @Configuration
  @ImportAutoConfiguration({
    DataSourceAutoConfiguration.class,
    HibernateJpaAutoConfiguration.class,
    FlywayAutoConfiguration.class
  })
  @EntityScan("com.example.backend.domain")
  @EnableJpaRepositories("com.example.backend.domain")
  static class JpaOnlyConfig {}

  @Autowired private PlanPurchaseRepository planPurchaseRepository;
  @Autowired private QuotaTopupRepository quotaTopupRepository;

  /**
   * Wipes the schema before Flyway runs, so this class and the schema test can
   * share one database without either seeing the other's rows.
   */
  @BeforeAll
  static void resetSchema() throws Exception {
    try (Connection c = connect();
        Statement s = c.createStatement()) {
      s.execute("DROP SCHEMA IF EXISTS public CASCADE");
      s.execute("CREATE SCHEMA public");
    }
  }

  private static Connection connect() throws Exception {
    return DriverManager.getConnection(
        System.getenv("MARKETSCOUT_TEST_DB_URL"),
        System.getenv().getOrDefault("MARKETSCOUT_TEST_DB_USER", "postgres"),
        System.getenv().getOrDefault("MARKETSCOUT_TEST_DB_PASSWORD", "postgres"));
  }

  /**
   * One customer who bought Starter, later upgraded to Pro, and also bought
   * credits on the side — the exact shape the old query got wrong. Plus a
   * pending transaction that must not count as revenue.
   */
  private void seed() throws Exception {
    try (Connection c = connect();
        Statement s = c.createStatement()) {
      s.execute(
          """
          INSERT INTO users (id, email, password_hash, full_name, role, plan_id,
                             quota_remaining, quota_used_this_cycle, cycle_reset_at,
                             is_active, email_verified)
          VALUES ('11111111-1111-1111-1111-111111111111', 'buyer@test.invalid', 'x', 'Buyer',
                  'user', (SELECT id FROM plans WHERE lower(name)='pro'),
                  10, 0, NOW() + INTERVAL '1 month', TRUE, TRUE)
          ON CONFLICT (id) DO NOTHING
          """);
      s.execute(
          """
          INSERT INTO invoices (id, user_id, invoice_no, status, total_vnd, amount_paid_vnd,
                                period_start, period_end, due_at, paid_at)
          VALUES ('22222222-2222-2222-2222-222222222222',
                  '11111111-1111-1111-1111-111111111111', 'INV-1', 'paid', 0, 0,
                  NOW(), NOW() + INTERVAL '1 month', NOW(), NOW())
          ON CONFLICT (id) DO NOTHING
          """);

      // completed: Starter purchase 2,000,000 | Pro purchase 5,800,000
      // completed: quota top-up 200,000 | pending: Pro purchase 5,800,000 (excluded)
      record Tx(String id, String status, String amount) {}
      List<Tx> txs =
          List.of(
              new Tx("aaaaaaa1-0000-0000-0000-000000000001", "completed", "2000000"),
              new Tx("aaaaaaa1-0000-0000-0000-000000000002", "completed", "5800000"),
              new Tx("aaaaaaa1-0000-0000-0000-000000000003", "completed", "200000"),
              new Tx("aaaaaaa1-0000-0000-0000-000000000004", "pending", "5800000"));
      for (Tx t : txs) {
        s.execute(
            """
            INSERT INTO payment_transactions (id, invoice_id, provider, status, amount_vnd)
            VALUES ('%s', '22222222-2222-2222-2222-222222222222', 'SEPAY', '%s', %s)
            ON CONFLICT (id) DO NOTHING
            """
                .formatted(t.id(), t.status(), t.amount()));
      }

      s.execute(
          """
          INSERT INTO plan_purchases (id, user_id, transaction_id, plan_id, price_vnd, status)
          VALUES ('bbbbbbb1-0000-0000-0000-000000000001',
                  '11111111-1111-1111-1111-111111111111',
                  'aaaaaaa1-0000-0000-0000-000000000001',
                  (SELECT id FROM plans WHERE lower(name)='starter'), 2000000, 'completed'),
                 ('bbbbbbb1-0000-0000-0000-000000000002',
                  '11111111-1111-1111-1111-111111111111',
                  'aaaaaaa1-0000-0000-0000-000000000002',
                  (SELECT id FROM plans WHERE lower(name)='pro'), 5800000, 'completed'),
                 ('bbbbbbb1-0000-0000-0000-000000000004',
                  '11111111-1111-1111-1111-111111111111',
                  'aaaaaaa1-0000-0000-0000-000000000004',
                  (SELECT id FROM plans WHERE lower(name)='pro'), 5800000, 'pending')
          ON CONFLICT (id) DO NOTHING
          """);
      s.execute(
          """
          INSERT INTO quota_topups (id, user_id, transaction_id, quota_added, price_vnd, status)
          VALUES ('ccccccc1-0000-0000-0000-000000000003',
                  '11111111-1111-1111-1111-111111111111',
                  'aaaaaaa1-0000-0000-0000-000000000003', 1, 200000, 'completed')
          ON CONFLICT (id) DO NOTHING
          """);
    }
  }

  @Test
  void splitsRevenueByThePlanActuallyBoughtAndByStandaloneTopUps() throws Exception {
    seed();

    Map<String, BigDecimal> byPlan = new HashMap<>();
    for (Object[] row : planPurchaseRepository.sumCompletedRevenueByPurchasedPlan()) {
      byPlan.put((String) row[0], (BigDecimal) row[1]);
    }

    // The buyer's current plan is Pro, yet their Starter payment stays on
    // Starter — that is the whole point of the change.
    assertThat(byPlan.get("Starter")).isEqualByComparingTo("2000000");
    assertThat(byPlan.get("Pro")).isEqualByComparingTo("5800000");

    // The top-up is its own bucket, not Pro revenue.
    assertThat(byPlan.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add))
        .as("plan buckets must exclude top-up money")
        .isEqualByComparingTo("7800000");
    assertThat(quotaTopupRepository.sumCompletedTopupRevenue()).isEqualByComparingTo("200000");
  }

  @Test
  void countsOnlyCompletedTransactions() throws Exception {
    seed();

    Map<String, BigDecimal> byPlan = new HashMap<>();
    for (Object[] row : planPurchaseRepository.sumCompletedRevenueByPurchasedPlan()) {
      byPlan.put((String) row[0], (BigDecimal) row[1]);
    }
    // A second, pending Pro purchase of 5,800,000 exists; Pro must not double.
    assertThat(byPlan.get("Pro"))
        .as("pending money is not revenue")
        .isEqualByComparingTo("5800000");
  }

  @Test
  void returnsZeroRatherThanNullWhenNothingWasBought() {
    assertThat(quotaTopupRepository.sumCompletedTopupRevenue())
        .as("COALESCE keeps the caller from NPE-ing on an empty database")
        .isNotNull();
  }
}
