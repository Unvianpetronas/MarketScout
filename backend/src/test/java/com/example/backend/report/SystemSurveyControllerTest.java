package com.example.backend.report;

import com.example.backend.config.JwtService;
import com.example.backend.domain.ReportRepository;
import com.example.backend.domain.SystemRating;
import com.example.backend.domain.SystemRatingRepository;
import com.example.backend.domain.Users;
import com.example.backend.domain.UsersRepository;
import com.example.backend.exception.AppException;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SystemSurveyControllerTest {

    @Mock private SystemRatingRepository ratingRepository;
    @Mock private ReportRepository reportRepository;
    @Mock private UsersRepository usersRepository;
    @Mock private JwtService jwtService;
    @Mock private Claims claims;

    private SystemSurveyController controller;

    private static final UUID USER_ID = UUID.randomUUID();
    private static final String AUTH = "Bearer token";

    @BeforeEach
    void setUp() {
        controller = new SystemSurveyController(ratingRepository, reportRepository, usersRepository, jwtService);
        lenient().when(jwtService.parseToken("token")).thenReturn(claims);
        lenient().when(jwtService.getId(claims)).thenReturn(USER_ID);
    }

    // ── SUS scoring (Brooke, 1996) ───────────────────────────────────────

    // All-5s is not a perfect score: even-numbered items are worded negatively,
    // so agreeing with every statement means agreeing the product is hard to
    // use half the time. Getting this backwards would silently inflate the
    // headline number this whole feature exists to report.
    @Test
    void susScore_allFives_isFifty_notOneHundred() {
        short[] answers = new short[10];
        java.util.Arrays.fill(answers, (short) 5);
        assertThat(SystemRating.susScore(answers).doubleValue()).isEqualTo(50.0);
    }

    @Test
    void susScore_bestPossibleAnswers_isOneHundred() {
        // 5 on positive (odd) items, 1 on negative (even) items.
        short[] answers = {5, 1, 5, 1, 5, 1, 5, 1, 5, 1};
        assertThat(SystemRating.susScore(answers).doubleValue()).isEqualTo(100.0);
    }

    @Test
    void susScore_worstPossibleAnswers_isZero() {
        short[] answers = {1, 5, 1, 5, 1, 5, 1, 5, 1, 5};
        assertThat(SystemRating.susScore(answers).doubleValue()).isEqualTo(0.0);
    }

    @Test
    void susScore_allNeutral_isFifty() {
        short[] answers = new short[10];
        java.util.Arrays.fill(answers, (short) 3);
        assertThat(SystemRating.susScore(answers).doubleValue()).isEqualTo(50.0);
    }

    @Test
    void susScore_rejectsWrongItemCount() {
        assertThatThrownBy(() -> SystemRating.susScore(new short[]{5, 1, 5}))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ── eligibility ──────────────────────────────────────────────────────

    @Test
    void eligibility_belowReportThreshold_isNotEligible() {
        when(ratingRepository.existsByUser_Id(USER_ID)).thenReturn(false);
        when(reportRepository.countByUserId(USER_ID)).thenReturn(1L);

        var body = controller.eligibility(AUTH).getBody();

        assertThat(body).isNotNull();
        assertThat(body.eligible()).isFalse();
        assertThat(body.reportsNeeded()).isEqualTo(2);
    }

    @Test
    void eligibility_atThreshold_isEligible() {
        when(ratingRepository.existsByUser_Id(USER_ID)).thenReturn(false);
        when(reportRepository.countByUserId(USER_ID)).thenReturn(3L);

        var body = controller.eligibility(AUTH).getBody();

        assertThat(body).isNotNull();
        assertThat(body.eligible()).isTrue();
        assertThat(body.reportsNeeded()).isZero();
    }

    // A dismissal is a row, so skipping must silence the prompt permanently
    // — the whole point of asking at most once.
    @Test
    void eligibility_alreadyAnsweredOrDismissed_isNotEligible_withoutCountingReports() {
        when(ratingRepository.existsByUser_Id(USER_ID)).thenReturn(true);

        var body = controller.eligibility(AUTH).getBody();

        assertThat(body).isNotNull();
        assertThat(body.eligible()).isFalse();
        verifyNoInteractions(reportRepository);
    }

    // ── submit ───────────────────────────────────────────────────────────

    @Test
    void submit_storesAnswersScoreAndStatus() {
        Users user = new Users();
        user.setId(USER_ID);
        when(ratingRepository.existsByUser_Id(USER_ID)).thenReturn(false);
        when(usersRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(ratingRepository.save(any())).thenAnswer(a -> a.getArgument(0));

        var req = new SystemSurveyController.SubmitRequest(
                List.of((short) 5, (short) 1, (short) 5, (short) 1, (short) 5,
                        (short) 1, (short) 5, (short) 1, (short) 5, (short) 1),
                "  Rất dễ dùng  ");

        var body = controller.submit(AUTH, req).getBody();

        assertThat(body).isNotNull();
        assertThat(body.score()).isEqualTo(100.0);

        ArgumentCaptor<SystemRating> saved = ArgumentCaptor.forClass(SystemRating.class);
        verify(ratingRepository).save(saved.capture());
        SystemRating r = saved.getValue();
        assertThat(r.getStatus()).isEqualTo(SystemRating.STATUS_SUBMITTED);
        assertThat(r.getQ1()).isEqualTo((short) 5);
        assertThat(r.getQ10()).isEqualTo((short) 1);
        assertThat(r.getComment()).isEqualTo("Rất dễ dùng");
    }

    @Test
    void submit_blankComment_storedAsNull() {
        Users user = new Users();
        user.setId(USER_ID);
        when(ratingRepository.existsByUser_Id(USER_ID)).thenReturn(false);
        when(usersRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(ratingRepository.save(any())).thenAnswer(a -> a.getArgument(0));

        var req = new SystemSurveyController.SubmitRequest(
                List.of((short) 3, (short) 3, (short) 3, (short) 3, (short) 3,
                        (short) 3, (short) 3, (short) 3, (short) 3, (short) 3),
                "   ");

        controller.submit(AUTH, req);

        ArgumentCaptor<SystemRating> saved = ArgumentCaptor.forClass(SystemRating.class);
        verify(ratingRepository).save(saved.capture());
        assertThat(saved.getValue().getComment()).isNull();
    }

    @Test
    void submit_secondTime_throws() {
        when(ratingRepository.existsByUser_Id(USER_ID)).thenReturn(true);

        var req = new SystemSurveyController.SubmitRequest(
                List.of((short) 3, (short) 3, (short) 3, (short) 3, (short) 3,
                        (short) 3, (short) 3, (short) 3, (short) 3, (short) 3),
                null);

        assertThatThrownBy(() -> controller.submit(AUTH, req))
                .isInstanceOf(AppException.class);
        verify(ratingRepository, never()).save(any());
    }

    // ── dismiss ──────────────────────────────────────────────────────────

    @Test
    void dismiss_writesDismissedRowWithNoAnswers() {
        Users user = new Users();
        user.setId(USER_ID);
        when(ratingRepository.existsByUser_Id(USER_ID)).thenReturn(false);
        when(usersRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        controller.dismiss(AUTH);

        ArgumentCaptor<SystemRating> saved = ArgumentCaptor.forClass(SystemRating.class);
        verify(ratingRepository).save(saved.capture());
        SystemRating r = saved.getValue();
        assertThat(r.getStatus()).isEqualTo(SystemRating.STATUS_DISMISSED);
        assertThat(r.getQ1()).isNull();
        assertThat(r.getScore()).isNull();
    }

    // Dismissing twice must not violate the one-row-per-user constraint.
    @Test
    void dismiss_whenRowAlreadyExists_isNoOp() {
        when(ratingRepository.existsByUser_Id(USER_ID)).thenReturn(true);

        controller.dismiss(AUTH);

        verify(ratingRepository, never()).save(any());
    }
}
