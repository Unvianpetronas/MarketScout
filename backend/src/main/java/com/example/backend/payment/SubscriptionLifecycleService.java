package com.example.backend.payment;

import com.example.backend.domain.Plan;
import com.example.backend.domain.PlanRepository;
import com.example.backend.domain.Subscription;
import com.example.backend.domain.SubscriptionRepository;
import com.example.backend.domain.Users;
import com.example.backend.domain.UsersRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Since SePay payments are one-time bank transfers (no card token / mandate),
 * there is no way to auto-charge a renewal. Instead: remind the user by email
 * before their paid plan expires, and if no renewal payment arrives within the
 * grace period, downgrade the account to the free plan.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SubscriptionLifecycleService {

    private static final String STATUS_ACTIVE = "active";
    private static final String STATUS_EXPIRED = "expired";
    private static final String FREE_PLAN_NAME = "free";

    private static final int REMINDER_DAYS_BEFORE_1 = 3;
    private static final int REMINDER_DAYS_BEFORE_2 = 1;
    private static final int GRACE_PERIOD_DAYS = 1;
    private static final int FREE_CYCLE_DAYS = 30;

    private final SubscriptionRepository subscriptionRepository;
    private final UsersRepository usersRepository;
    private final PlanRepository planRepository;
    private final SubscriptionEmailService subscriptionEmailService;

    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void runDailyLifecycleSweep() {
        sendRenewalReminders();
        downgradeExpiredSubscriptions();
    }

    private void sendRenewalReminders() {
        Instant now = Instant.now();
        sendReminderWindow(now, REMINDER_DAYS_BEFORE_1, true);
        sendReminderWindow(now, REMINDER_DAYS_BEFORE_2, false);
    }

    private void sendReminderWindow(Instant now, int daysBefore, boolean isThreeDayReminder) {
        Instant windowStart = now.plus(daysBefore - 1, ChronoUnit.DAYS);
        Instant windowEnd = now.plus(daysBefore, ChronoUnit.DAYS);

        List<Subscription> due = subscriptionRepository
                .findByStatusAndCurrentPeriodEndBetween(STATUS_ACTIVE, windowStart, windowEnd);

        for (Subscription sub : due) {
            if (isFreePlan(sub.getPlan())) continue;
            boolean alreadySent = isThreeDayReminder ? sub.getReminderSent3dAt() != null : sub.getReminderSent1dAt() != null;
            if (alreadySent) continue;

            Users user = sub.getUser();
            subscriptionEmailService.sendRenewalReminderEmail(
                    user.getEmail(), user.getFullName(), sub.getPlan().getName(), daysBefore, sub.getCurrentPeriodEnd());

            if (isThreeDayReminder) {
                sub.setReminderSent3dAt(now);
            } else {
                sub.setReminderSent1dAt(now);
            }
            subscriptionRepository.save(sub);
        }
    }

    private void downgradeExpiredSubscriptions() {
        Instant cutoff = Instant.now().minus(GRACE_PERIOD_DAYS, ChronoUnit.DAYS);
        List<Subscription> expired = subscriptionRepository
                .findByStatusAndCurrentPeriodEndBefore(STATUS_ACTIVE, cutoff);

        if (expired.isEmpty()) return;

        Plan freePlan = planRepository.findByNameIgnoreCase(FREE_PLAN_NAME)
                .orElseThrow(() -> new IllegalStateException("Free plan not found — cannot downgrade expired subscriptions"));

        for (Subscription sub : expired) {
            if (isFreePlan(sub.getPlan())) continue;

            String oldPlanName = sub.getPlan().getName();
            sub.setStatus(STATUS_EXPIRED);
            subscriptionRepository.save(sub);

            Users user = sub.getUser();
            user.setPlan(freePlan);
            user.setQuotaRemaining(freePlan.getMonthlyQuota());
            user.setQuotaUsedThisCycle(0);
            user.setCycleResetAt(Instant.now().plus(FREE_CYCLE_DAYS, ChronoUnit.DAYS));
            usersRepository.save(user);

            subscriptionEmailService.sendDowngradedEmail(user.getEmail(), user.getFullName(), oldPlanName);

            log.info("Subscription expired — user={} oldPlan={} downgraded to free", user.getId(), oldPlanName);
        }
    }

    private boolean isFreePlan(Plan plan) {
        return plan == null || FREE_PLAN_NAME.equalsIgnoreCase(plan.getName());
    }
}
