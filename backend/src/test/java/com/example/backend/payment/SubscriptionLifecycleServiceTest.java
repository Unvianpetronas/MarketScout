package com.example.backend.payment;

import com.example.backend.domain.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Covers the 2026-07-20 deferred-plan-change hook into the expiry sweep. */
@ExtendWith(MockitoExtension.class)
class SubscriptionLifecycleServiceTest {

    @Mock private SubscriptionRepository subscriptionRepository;
    @Mock private UsersRepository usersRepository;
    @Mock private PlanRepository planRepository;
    @Mock private SubscriptionEmailService subscriptionEmailService;

    private SubscriptionLifecycleService service;
    private Plan freePlan;

    @BeforeEach
    void setUp() {
        service = new SubscriptionLifecycleService(subscriptionRepository, usersRepository, planRepository, subscriptionEmailService);
        freePlan = new Plan();
        freePlan.setId(1);
        freePlan.setName("free");
        freePlan.setMonthlyQuota(3);
        lenient().when(planRepository.findByNameIgnoreCase("free")).thenReturn(Optional.of(freePlan));
        // No reminders due in these tests — keep them focused on the expiry branch.
        lenient().when(subscriptionRepository.findByStatusAndCurrentPeriodEndBetween(eq("active"), any(), any()))
                .thenReturn(List.of());
    }

    private Subscription expiredSub(Users user, Plan plan) {
        return Subscription.builder()
                .user(user).plan(plan).status("active")
                .currentPeriodEnd(Instant.now().minus(2, ChronoUnit.DAYS))
                .build();
    }

    @Test
    void expiredSubscription_withPendingPlan_movesToFreeAndSendsScheduledChangeEmail_notDowngradeEmail() {
        Plan pro = new Plan(); pro.setId(2); pro.setName("pro");
        Plan enterprise = new Plan(); enterprise.setId(3); enterprise.setName("enterprise");
        Users user = new Users();
        user.setEmail("buyer@example.com");
        user.setFullName("Buyer");
        user.setPlan(pro);
        user.setPendingPlan(enterprise);
        Subscription sub = expiredSub(user, pro);

        when(subscriptionRepository.findByStatusAndCurrentPeriodEndBefore(eq("active"), any()))
                .thenReturn(List.of(sub));

        service.runDailyLifecycleSweep();

        assertThat(user.getPlan().getName()).isEqualTo("free");
        assertThat(user.getPendingPlan()).isNull();
        assertThat(user.getPendingPlanRequestedAt()).isNull();
        verify(subscriptionEmailService).sendScheduledPlanChangeReadyEmail("buyer@example.com", "Buyer", "enterprise");
        verify(subscriptionEmailService, never()).sendDowngradedEmail(any(), any(), any());
    }

    @Test
    void expiredSubscription_withoutPendingPlan_sendsRegularDowngradeEmail() {
        Plan pro = new Plan(); pro.setId(2); pro.setName("pro");
        Users user = new Users();
        user.setEmail("buyer@example.com");
        user.setFullName("Buyer");
        user.setPlan(pro);
        Subscription sub = expiredSub(user, pro);

        when(subscriptionRepository.findByStatusAndCurrentPeriodEndBefore(eq("active"), any()))
                .thenReturn(List.of(sub));

        service.runDailyLifecycleSweep();

        assertThat(user.getPlan().getName()).isEqualTo("free");
        verify(subscriptionEmailService).sendDowngradedEmail("buyer@example.com", "Buyer", "pro");
        verify(subscriptionEmailService, never()).sendScheduledPlanChangeReadyEmail(any(), any(), any());
    }

    @Test
    void expiredSubscription_pendingPlanIsFree_treatedAsRegularDowngrade() {
        Plan pro = new Plan(); pro.setId(2); pro.setName("pro");
        Users user = new Users();
        user.setEmail("buyer@example.com");
        user.setFullName("Buyer");
        user.setPlan(pro);
        user.setPendingPlan(freePlan); // user had scheduled a downgrade to Free
        Subscription sub = expiredSub(user, pro);

        when(subscriptionRepository.findByStatusAndCurrentPeriodEndBefore(eq("active"), any()))
                .thenReturn(List.of(sub));

        service.runDailyLifecycleSweep();

        assertThat(user.getPendingPlan()).isNull();
        verify(subscriptionEmailService).sendDowngradedEmail("buyer@example.com", "Buyer", "pro");
        verify(subscriptionEmailService, never()).sendScheduledPlanChangeReadyEmail(any(), any(), any());
    }
}
