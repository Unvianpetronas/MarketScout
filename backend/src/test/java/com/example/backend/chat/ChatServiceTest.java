package com.example.backend.chat;

import com.example.backend.contract.ContractLinkService;
import com.example.backend.domain.ChatMessageRepository;
import com.example.backend.domain.ChatSessionRepository;
import com.example.backend.domain.ReportRepository;
import com.example.backend.domain.UsersRepository;
import com.example.backend.partners.FindPartnersService;
import com.example.backend.partners.QuickScanService;
import com.example.backend.quota.QuotaService;
import com.example.backend.report.ReportDTO;
import com.example.backend.shared.cache.CacheService;
import com.example.backend.shared.gemini.GeminiService;
import com.example.backend.shared.model.agent.IntentResult;
import com.example.backend.shared.model.crawler.LeadResult;
import com.example.backend.verification.DealSafetyAgent;
import com.example.backend.verification.ScoringEngine;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    @Mock private ChatSessionRepository sessionRepo;
    @Mock private ChatMessageRepository messageRepo;
    @Mock private UsersRepository usersRepo;
    @Mock private ReportRepository reportRepo;
    @Mock private GeminiService geminiService;
    @Mock private QuotaService quotaService;
    @Mock private IntentDetector intentDetector;
    @Mock private FindPartnersService findPartnersService;
    @Mock private QuickScanService quickScanService;
    @Mock private ScoringEngine scoringEngine;
    @Mock private DealSafetyAgent dealSafetyAgent;
    @Mock private ContractLinkService contractLinkService;
    @Mock private CompanyResolverService companyResolverService;
    @Mock private CacheService cacheService;

    private ChatService chatService;

    @BeforeEach
    void setUp() {
        chatService = new ChatService(sessionRepo, messageRepo, usersRepo, reportRepo,
            geminiService, quotaService, intentDetector, findPartnersService, quickScanService,
            scoringEngine, dealSafetyAgent, contractLinkService, companyResolverService,
            cacheService, new ObjectMapper());
        lenient().when(companyResolverService.getPendingClarification(any())).thenReturn(Optional.empty());
    }

    private ReportDTO.ChatMessageRequest req(String message, String website) {
        ReportDTO.ChatMessageRequest r = new ReportDTO.ChatMessageRequest();
        r.setMessage(message);
        r.setWebsite(website);
        return r;
    }

    // ── resolveCompany: rawName preference ──────────────────────────────────

    @Test
    void resolveCompany_prefersIntentCompanyName_overTaxIdAndMessage() {
        IntentResult intent = IntentResult.builder()
            .companyName("ABC Trading Co").taxId("0107781148").build();
        when(companyResolverService.resolve(eq("ABC Trading Co"), any()))
            .thenReturn(CompanyResolutionResult.builder().normalizedName("ABC Trading Co").ambiguous(false).build());

        chatService.resolveCompany("session1", intent, req("Verify company ABC Trading Co", null));

        verify(companyResolverService).resolve(eq("ABC Trading Co"), any());
    }

    @Test
    void resolveCompany_fallsBackToIntentTaxId_whenCompanyNameMissing() {
        // Reported bug: typing a bare MST into /verify was landing the FULL raw
        // sentence in CompanyResolverService instead of just the tax ID, because the
        // old fallback only considered intent.companyName, never intent.taxId.
        IntentResult intent = IntentResult.builder().companyName(null).taxId("0107781148").build();
        when(companyResolverService.resolve(eq("0107781148"), any()))
            .thenReturn(CompanyResolutionResult.builder().normalizedName("0107781148").ambiguous(false).build());

        chatService.resolveCompany("session1",
            intent, req("Verify company \"0107781148\" in Vietnam. Run full background check.", null));

        verify(companyResolverService).resolve(eq("0107781148"), any());
    }

    @Test
    void resolveCompany_fallsBackToRawMessage_whenNeitherCompanyNameNorTaxIdPresent() {
        IntentResult intent = IntentResult.builder().companyName(null).taxId(null).build();
        when(companyResolverService.resolve(eq("some free text"), any()))
            .thenReturn(CompanyResolutionResult.builder().normalizedName("some free text").ambiguous(false).build());

        chatService.resolveCompany("session1", intent, req("some free text", null));

        verify(companyResolverService).resolve(eq("some free text"), any());
    }

    // ── resolveCompany: website hint bypass ─────────────────────────────────

    @Test
    void resolveCompany_websiteHintPresent_skipsResolverEntirely() {
        IntentResult intent = IntentResult.builder().companyName("Nội Thất Ngọc Nam").country("VN").build();

        CompanyResolutionResult result = chatService.resolveCompany("session1", intent,
            req("Nội Thất Ngọc Nam", "https://www.noithatngocnam.com/"));

        assertThat(result.isAmbiguous()).isFalse();
        assertThat(result.getNormalizedName()).isEqualTo("Nội Thất Ngọc Nam");
        assertThat(result.getCountryIso2()).isEqualTo("VN");
        verify(companyResolverService, never()).resolve(any(), any());
    }

    @Test
    void resolveCompany_websiteHintBlank_stillCallsResolver() {
        IntentResult intent = IntentResult.builder().companyName("XYZ").build();
        when(companyResolverService.resolve(eq("XYZ"), any()))
            .thenReturn(CompanyResolutionResult.builder().normalizedName("XYZ").ambiguous(true).build());

        chatService.resolveCompany("session1", intent, req("XYZ", "   "));

        verify(companyResolverService).resolve(eq("XYZ"), any());
    }

    @Test
    void resolveCompany_clearsPendingClarification_whenOnePresent() {
        CompanyResolutionResult pending = CompanyResolutionResult.builder().normalizedName("XYZ").build();
        when(companyResolverService.getPendingClarification("session1")).thenReturn(Optional.of(pending));
        when(companyResolverService.buildContextFromPending(pending)).thenReturn("ctx");
        when(companyResolverService.resolve(any(), eq("ctx")))
            .thenReturn(CompanyResolutionResult.builder().normalizedName("XYZ Corp").ambiguous(false).build());

        chatService.resolveCompany("session1", IntentResult.builder().companyName("XYZ Corp").build(), req("XYZ Corp", null));

        verify(companyResolverService).clearPendingClarification("session1");
    }

    // ── buildClarifyData: real candidate search ─────────────────────────────

    @Test
    void buildClarifyData_includesCandidates_whenFindPartnersReturnsResults() {
        CompanyResolutionResult resolved = CompanyResolutionResult.builder()
            .normalizedName("Nội Thất Ngọc Nam").countryIso2("VN")
            .ambiguous(true).alternatives(List.of("Alt 1")).build();
        List<LeadResult> leads = List.of(
            LeadResult.builder().companyName("Nội Thất Ngọc Nam Co Ltd").website("https://noithatngocnam.com").build());
        when(findPartnersService.searchCandidatesByName("Nội Thất Ngọc Nam", "VN")).thenReturn(leads);

        var data = chatService.buildClarifyData(resolved);

        assertThat(data).containsEntry("pending", true);
        assertThat(data).containsKey("candidates");
        @SuppressWarnings("unchecked")
        List<LeadResult> candidates = (List<LeadResult>) data.get("candidates");
        assertThat(candidates).hasSize(1);
        assertThat(candidates.get(0).getCompanyName()).isEqualTo("Nội Thất Ngọc Nam Co Ltd");
    }

    @Test
    void buildClarifyData_omitsCandidatesKey_whenNoneFound() {
        CompanyResolutionResult resolved = CompanyResolutionResult.builder()
            .normalizedName("XYZ").countryIso2(null).ambiguous(true).alternatives(List.of()).build();
        when(findPartnersService.searchCandidatesByName("XYZ", null)).thenReturn(List.of());

        var data = chatService.buildClarifyData(resolved);

        assertThat(data).doesNotContainKey("candidates");
    }

    @Test
    void buildClarifyData_swallowsCandidateSearchException() {
        CompanyResolutionResult resolved = CompanyResolutionResult.builder()
            .normalizedName("XYZ").countryIso2(null).ambiguous(true).alternatives(List.of()).build();
        when(findPartnersService.searchCandidatesByName(any(), any())).thenThrow(new RuntimeException("Tavily down"));

        var data = chatService.buildClarifyData(resolved);

        assertThat(data).containsEntry("pending", true);
        assertThat(data).doesNotContainKey("candidates");
    }
}
