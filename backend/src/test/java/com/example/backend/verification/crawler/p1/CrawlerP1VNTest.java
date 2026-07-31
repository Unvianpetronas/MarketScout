package com.example.backend.verification.crawler.p1;

import com.example.backend.partners.TavilyClient;
import com.example.backend.shared.model.crawler.P1Data;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * VN entity validation regressions. The live symptom was an active company
 * (MST 0107781148) scoring 20/100 FAIL with "Trạng thái không xác định": the
 * crawler hardcoded ACTIVE, never put the registry status into rawText, and
 * resolved names through masothue.vn — a domain that no longer exists.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CrawlerP1VNTest {

    @Mock private RestTemplate restTemplate;
    @Mock private TavilyClient tavilyClient;

    private CrawlerP1VN crawler() {
        CrawlerP1VN c = new CrawlerP1VN(restTemplate, tavilyClient);
        ReflectionTestUtils.setField(c, "vietqrUrl", "https://api.vietqr.io/v2");
        return c;
    }

    /** Shape of a real api.vietqr.io/v2/business/{mst} response. */
    private void stubVietQr(String mst, String name, String status) {
        when(restTemplate.getForEntity(eq("https://api.vietqr.io/v2/business/" + mst), eq(Map.class)))
            .thenReturn(ResponseEntity.ok(Map.of(
                "code", "00",
                "data", Map.of(
                    "id", mst,
                    "name", name,
                    "address", "Số 74, ngõ 14 phố Vũ Hữu, Phường Đại Mỗ, TP Hà Nội",
                    "status", status))));
    }

    @Test
    void fetchByMST_activeCompany_mapsStatusAndPutsItInRawText() {
        stubVietQr("0107781148", "CÔNG TY TNHH THƯƠNG MẠI VÀ DỊCH VỤ BẢO HÂN VIỆT NAM", "NNT đang hoạt động");

        P1Data d = crawler().fetchByMST("0107781148");

        assertThat(d.isFound()).isTrue();
        assertThat(d.getStatus()).isEqualTo("ACTIVE");
        // FactExtractor feeds rawText to Gemini; without the status the rubric fell
        // through to "Trạng thái không xác định" for every Vietnamese company.
        assertThat(d.getRawText()).contains("Status: NNT đang hoạt động");
    }

    @Test
    void fetchByMST_ceasedCompany_isNotReportedActive() {
        stubVietQr("0100109106", "CÔNG TY ĐÃ NGHỈ",
            "NNT ngừng hoạt động nhưng chưa hoàn thành thủ tục đóng MST");

        // The phrase still contains "hoạt động" — the negative marker must win.
        assertThat(crawler().fetchByMST("0100109106").getStatus()).isEqualTo("INACTIVE");
    }

    @Test
    void fetchByMST_unrecognisedStatus_staysUnknownRatherThanGuessingActive() {
        stubVietQr("0100109107", "CÔNG TY LẠ", "Tình trạng nào đó chưa từng thấy");

        assertThat(crawler().fetchByMST("0100109107").getStatus()).isNull();
    }

    @Test
    void findMSTByName_readsMstFromSearchUrlAndConfirmsAgainstRegistry() {
        when(tavilyClient.searchUrls(anyString(), anyInt())).thenReturn(List.of(
            "https://www.facebook.com/somepage",
            "https://masothue.com/0107781148-cong-ty-tnhh-thuong-mai-va-dich-vu-bao-han-viet-nam"));
        stubVietQr("0107781148", "CÔNG TY TNHH THƯƠNG MẠI VÀ DỊCH VỤ BẢO HÂN VIỆT NAM", "NNT đang hoạt động");

        P1Data d = crawler().findMSTByName("Công ty TNHH Thương mại và Dịch vụ Bảo Hân Việt Nam");

        assertThat(d.isFound()).isTrue();
        assertThat(d.getRegistrationId()).isEqualTo("0107781148");
    }

    @Test
    void findMSTByName_registryNameIsADifferentCompany_isRejected() {
        when(tavilyClient.searchUrls(anyString(), anyInt()))
            .thenReturn(List.of("https://masothue.com/0107781148-cong-ty-khac"));
        stubVietQr("0107781148", "CÔNG TY CỔ PHẦN SỮA VIỆT NAM", "NNT đang hoạt động");

        // Verifying the wrong company is worse than returning "not found".
        assertThat(crawler().findMSTByName("Công ty TNHH Bảo Hân").isFound()).isFalse();
    }

    @Test
    void findMSTByName_searchUnavailable_isATechnicalSkipNotNotFound() {
        when(tavilyClient.searchUrls(anyString(), anyInt())).thenReturn(List.of());

        P1Data d = crawler().findMSTByName("Công ty TNHH Bảo Hân");

        assertThat(d.isFound()).isFalse();
        assertThat(d.getErrorMsg()).contains("lỗi kỹ thuật");
    }
}
