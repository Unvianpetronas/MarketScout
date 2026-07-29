package com.example.backend.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.UUID;

/**
 * One user's System Usability Scale response — usability of the product, as
 * opposed to {@link ReportRating} which rates the correctness of a single
 * report. Asked once per user; a skip is stored as {@code status='dismissed'}
 * so the prompt is never shown again.
 */
@Getter
@Setter
@Entity
@Table(name = "system_ratings")
public class SystemRating {

    public static final String STATUS_SUBMITTED = "submitted";
    public static final String STATUS_DISMISSED = "dismissed";

    /** SUS is defined over exactly ten items; anything else is not a SUS score. */
    public static final int ITEM_COUNT = 10;

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private Users user;

    @NotNull
    @Column(name = "status", nullable = false, length = 12)
    private String status;

    @Column(name = "q1")  private Short q1;
    @Column(name = "q2")  private Short q2;
    @Column(name = "q3")  private Short q3;
    @Column(name = "q4")  private Short q4;
    @Column(name = "q5")  private Short q5;
    @Column(name = "q6")  private Short q6;
    @Column(name = "q7")  private Short q7;
    @Column(name = "q8")  private Short q8;
    @Column(name = "q9")  private Short q9;
    @Column(name = "q10") private Short q10;

    @Column(name = "score", precision = 5, scale = 2)
    private BigDecimal score;

    @Column(name = "comment", columnDefinition = "text")
    private String comment;

    @NotNull
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }

    /**
     * The standard SUS formula (Brooke, 1996): odd-numbered items contribute
     * {@code answer - 1}, even-numbered items contribute {@code 5 - answer}
     * (they are worded negatively), and the total is multiplied by 2.5 to give
     * a 0–100 score. Note this is <em>not</em> a percentage — 68 is the
     * published industry average, not a passing grade.
     *
     * @param answers exactly {@link #ITEM_COUNT} responses, each 1–5
     */
    public static BigDecimal susScore(short[] answers) {
        if (answers == null || answers.length != ITEM_COUNT) {
            throw new IllegalArgumentException("SUS requires exactly " + ITEM_COUNT + " answers");
        }
        int total = 0;
        for (int i = 0; i < ITEM_COUNT; i++) {
            short a = answers[i];
            if (a < 1 || a > 5) throw new IllegalArgumentException("SUS answers must be 1..5, got " + a);
            total += (i % 2 == 0) ? a - 1 : 5 - a;
        }
        return BigDecimal.valueOf(total * 2.5).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * The ten answers in question order, or an empty list for a dismissal
     * (which stores no answers at all — see the table's completeness CHECK).
     */
    public java.util.List<Short> answers() {
        if (q1 == null) return java.util.List.of();
        return java.util.List.of(q1, q2, q3, q4, q5, q6, q7, q8, q9, q10);
    }

    public void applyAnswers(short[] answers) {
        q1 = answers[0]; q2 = answers[1]; q3 = answers[2]; q4 = answers[3]; q5 = answers[4];
        q6 = answers[5]; q7 = answers[6]; q8 = answers[7]; q9 = answers[8]; q10 = answers[9];
        score = susScore(answers);
        status = STATUS_SUBMITTED;
    }
}
