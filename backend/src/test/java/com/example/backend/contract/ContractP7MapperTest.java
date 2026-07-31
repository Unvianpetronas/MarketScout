package com.example.backend.contract;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static com.example.backend.contract.ContractP7Mapper.classifyPaymentMethod;
import static com.example.backend.contract.ContractP7Mapper.normalizeDepositPercent;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * P7 turns an uploaded contract into scoring facts, so a misclassification here
 * silently tells a customer an unsafe deal structure is fine.
 */
class ContractP7MapperTest {

    private final ObjectMapper mapper = new ObjectMapper();

    // ── Payment method ────────────────────────────────────────────────────

    @Test
    void classify_letterOfCredit_isSafe() {
        assertThat(classifyPaymentMethod("L/C at sight")).isEqualTo("SAFE");
        assertThat(classifyPaymentMethod("Thư tín dụng không huỷ ngang")).isEqualTo("SAFE");
    }

    @Test
    void classify_englishFullAdvance_isRisky() {
        // Used to require Vietnamese wording, so this — the most common export scam
        // structure there is — came out MODERATE.
        assertThat(classifyPaymentMethod("100% advance payment before shipment")).isEqualTo("RISKY");
        assertThat(classifyPaymentMethod("Full prepayment by T/T")).isEqualTo("RISKY");
    }

    @Test
    void classify_vietnameseFullAdvance_stillRisky() {
        assertThat(classifyPaymentMethod("Thanh toán 100% trả trước")).isEqualTo("RISKY");
    }

    @Test
    void classify_irreversibleRails_areRisky() {
        assertThat(classifyPaymentMethod("Payment via Western Union")).isEqualTo("RISKY");
        assertThat(classifyPaymentMethod("Thanh toán bằng USDT")).isEqualTo("RISKY");
    }

    @Test
    void classify_unsecuredTerms_areRisky() {
        assertThat(classifyPaymentMethod("D/A 60 days")).isEqualTo("RISKY");
        assertThat(classifyPaymentMethod("Open account 90 days")).isEqualTo("RISKY");
    }

    @Test
    void classify_riskyWordingMentioningLc_isNotSafe() {
        // Contains "l/c" but is the opposite of an L/C deal — risky terms must win.
        assertThat(classifyPaymentMethod("100% advance payment, no L/C accepted")).isEqualTo("RISKY");
    }

    @Test
    void classify_ordinaryTt_isModerate() {
        assertThat(classifyPaymentMethod("T/T 30 days after B/L date")).isEqualTo("MODERATE");
    }

    @Test
    void classify_blankOrNull_isUnknown() {
        assertThat(classifyPaymentMethod(null)).isNull();
        assertThat(classifyPaymentMethod("  ")).isNull();
    }

    // ── Deposit percentage ────────────────────────────────────────────────

    @Test
    void deposit_fractionIsReadAsPercent() {
        // 0.3 used to truncate to 0, which the rubric rewarded as "reasonable deposit (0%)".
        assertThat(normalizeDepositPercent(mapper.getNodeFactory().numberNode(0.3))).isEqualTo(30);
    }

    @Test
    void deposit_wholePercentPassesThrough() {
        assertThat(normalizeDepositPercent(mapper.getNodeFactory().numberNode(30))).isEqualTo(30);
        assertThat(normalizeDepositPercent(mapper.getNodeFactory().numberNode(100))).isEqualTo(100);
    }

    @Test
    void deposit_outOfRangeIsDropped() {
        assertThat(normalizeDepositPercent(mapper.getNodeFactory().numberNode(500))).isNull();
        assertThat(normalizeDepositPercent(mapper.getNodeFactory().numberNode(-5))).isNull();
    }

    @Test
    void deposit_nonNumericIsDropped() {
        assertThat(normalizeDepositPercent(mapper.getNodeFactory().textNode("ba mươi phần trăm"))).isNull();
        assertThat(normalizeDepositPercent(null)).isNull();
    }
}
