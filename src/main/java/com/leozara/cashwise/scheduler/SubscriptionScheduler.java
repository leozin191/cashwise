package com.leozara.cashwise.scheduler;

import com.leozara.cashwise.model.Expense;
import com.leozara.cashwise.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class SubscriptionScheduler {

    private final SubscriptionService subscriptionService;

    @Scheduled(cron = "0 5 0 * * *")
    public void processDaily() {
        log.info("Processing subscriptions...");
        List<Expense> created = subscriptionService.processAllDueSubscriptions();
        log.info("Created {} expenses from subscriptions", created.size());
    }
}
