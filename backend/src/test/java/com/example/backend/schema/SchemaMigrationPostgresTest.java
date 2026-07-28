package com.example.backend.schema;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Stream;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.output.MigrateResult;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/**
 * Applies the real Flyway migrations to a real, empty PostgreSQL and checks the
 * resulting schema against the JPA entities.
 *
 * <p>WHY: every other test here is a Mockito unit test — nothing touched a
 * database, so nothing verified that the migrations even run, let alone that
 * they produce the schema the entities expect. That is how
 * {@code Report.aiRecommendations} stayed mapped while no migration created
 * {@code reports.ai_recommendations}: production only had the column from an
 * ALTER someone ran by hand and never wrote down.
 *
 * <p>The database comes from the environment rather than Testcontainers, whose
 * bundled docker-java cannot negotiate an API version Docker Engine 29 accepts:
 *
 * <pre>
 *   CI      — `services: postgres` in .github/workflows/ci.yml
 *   locally — docker run --rm -d -p 55432:5432 -e POSTGRES_PASSWORD=postgres \
 *               -e POSTGRES_DB=marketscout_test --name ms-test-pg postgres:16-alpine
 *             MARKETSCOUT_TEST_DB_URL=jdbc:postgresql://localhost:55432/marketscout_test \
 *               ./mvnw test -Dtest=SchemaMigrationPostgresTest
 * </pre>
 *
 * <p>Skipped when {@code MARKETSCOUT_TEST_DB_URL} is unset, so the normal
 * `mvn test` on a machine without Postgres still passes. CI always sets it, so
 * the check cannot silently stop running there.
 *
 * <p>NOTE: this drops and recreates the {@code public} schema, so it must only
 * ever point at a throwaway database.
 */
class SchemaMigrationPostgresTest {

  private static final String URL = System.getenv("MARKETSCOUT_TEST_DB_URL");
  private static final String USER =
      System.getenv().getOrDefault("MARKETSCOUT_TEST_DB_USER", "postgres");
  private static final String PASSWORD =
      System.getenv().getOrDefault("MARKETSCOUT_TEST_DB_PASSWORD", "postgres");

  private static MigrateResult migrateResult;

  @BeforeAll
  static void migrate() throws Exception {
    assumeTrue(URL != null && !URL.isBlank(), "set MARKETSCOUT_TEST_DB_URL to run");

    // Start from nothing so V1 genuinely executes — this is the only place the
    // baseline script is ever run.
    try (Connection c = connect();
        Statement s = c.createStatement()) {
      s.execute("DROP SCHEMA public CASCADE");
      s.execute("CREATE SCHEMA public");
    }

    migrateResult =
        Flyway.configure()
            .dataSource(URL, USER, PASSWORD)
            .locations("classpath:db/migration")
            .baselineOnMigrate(false)
            .load()
            .migrate();
  }

  private static Connection connect() throws Exception {
    return DriverManager.getConnection(URL, USER, PASSWORD);
  }

  @Test
  void everyMigrationAppliesCleanlyToAnEmptyDatabase() {
    assertThat(migrateResult.success).isTrue();
    assertThat(migrateResult.migrationsExecuted)
        .as("all V*.sql files in db/migration should apply")
        .isEqualTo(9);
  }

  /**
   * The guard that would have caught the drift: every column an entity maps
   * must exist in the migrated schema.
   */
  @Test
  void everyEntityColumnExistsInTheMigratedSchema() throws Exception {
    Set<String> actual = new TreeSet<>();
    try (Connection c = connect();
        Statement s = c.createStatement();
        ResultSet rs =
            s.executeQuery(
                "SELECT table_name, column_name FROM information_schema.columns "
                    + "WHERE table_schema = 'public'")) {
      while (rs.next()) actual.add(rs.getString(1) + "." + rs.getString(2));
    }

    List<String> missing = new ArrayList<>();
    for (Class<?> entity : entityClasses()) {
      String table = tableName(entity);
      for (String column : mappedColumns(entity)) {
        if (!actual.contains(table + "." + column)) missing.add(table + "." + column);
      }
    }

    assertThat(missing)
        .as("entity mappings with no matching column — the migrations are behind the code")
        .isEmpty();
  }

  /** Regression guard for the specific column that was missing. */
  @Test
  void reportsHasAiRecommendationsFromV9() throws Exception {
    try (Connection c = connect();
        Statement s = c.createStatement();
        ResultSet rs =
            s.executeQuery(
                "SELECT data_type FROM information_schema.columns "
                    + "WHERE table_name = 'reports' AND column_name = 'ai_recommendations'")) {
      assertThat(rs.next()).as("reports.ai_recommendations must exist").isTrue();
      assertThat(rs.getString(1)).isEqualTo("text");
    }
  }

  /**
   * The admin seed was removed from the baseline because this repository is
   * public and it carried real emails plus BCrypt hashes. Keep it out: a
   * migrated database must contain no accounts at all.
   */
  @Test
  void migrationsSeedNoCredentials() throws Exception {
    try (Connection c = connect();
        Statement s = c.createStatement();
        ResultSet rs = s.executeQuery("SELECT count(*) FROM users")) {
      rs.next();
      assertThat(rs.getInt(1)).as("no migration may seed an account into a public repo").isZero();
    }
  }

  // ── entity reflection ────────────────────────────────────────────────────

  /** Loads @Entity classes straight off the compiled output directory. */
  private static List<Class<?>> entityClasses() throws Exception {
    Path domain = Path.of("target", "classes", "com", "example", "backend", "domain");
    assertThat(Files.isDirectory(domain)).as("compiled domain classes").isTrue();
    List<Class<?>> found = new ArrayList<>();
    try (Stream<Path> files = Files.list(domain)) {
      for (Path p : files.toList()) {
        String name = p.getFileName().toString();
        if (!name.endsWith(".class") || name.contains("$")) continue;
        Class<?> c =
            Class.forName("com.example.backend.domain." + name.substring(0, name.length() - 6));
        if (c.isAnnotationPresent(Entity.class)) found.add(c);
      }
    }
    assertThat(found).as("should discover the JPA entities").isNotEmpty();
    return found;
  }

  private static String tableName(Class<?> entity) {
    Table t = entity.getAnnotation(Table.class);
    if (t != null && !t.name().isBlank()) return t.name();
    return camelToSnake(entity.getSimpleName());
  }

  /** Physical columns an entity maps; skips transients and inverse relations. */
  private static Set<String> mappedColumns(Class<?> entity) {
    Set<String> columns = new LinkedHashSet<>();
    for (Field f : entity.getDeclaredFields()) {
      if (Modifier.isStatic(f.getModifiers()) || f.isSynthetic()) continue;
      if (f.isAnnotationPresent(Transient.class)) continue;
      // Owned by the other side — no column on this table.
      if (f.isAnnotationPresent(OneToMany.class) || f.isAnnotationPresent(ManyToMany.class)) {
        continue;
      }

      JoinColumn join = f.getAnnotation(JoinColumn.class);
      if (join != null && !join.name().isBlank()) {
        columns.add(unquote(join.name()));
        continue;
      }
      Column col = f.getAnnotation(Column.class);
      if (col != null && !col.name().isBlank()) {
        columns.add(unquote(col.name()));
        continue;
      }
      columns.add(camelToSnake(f.getName()));
    }
    return columns;
  }

  /**
   * Entities may quote a reserved-ish identifier, e.g. AuditLog maps
   * {@code name = "\"action\""}. Hibernate reads that as a quoted identifier
   * for the column {@code action}, so compare against the bare name.
   */
  private static String unquote(String identifier) {
    String s = identifier.trim();
    if (s.length() >= 2 && s.startsWith("\"") && s.endsWith("\"")) {
      return s.substring(1, s.length() - 1);
    }
    return s;
  }

  private static String camelToSnake(String s) {
    return s.replaceAll("([a-z0-9])([A-Z])", "$1_$2").toLowerCase(Locale.ROOT);
  }
}
