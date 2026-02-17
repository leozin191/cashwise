package com.leozara.cashwise.service;

import com.leozara.cashwise.exception.ResourceNotFoundException;
import com.leozara.cashwise.model.Expense;
import com.leozara.cashwise.model.Subscription;
import com.leozara.cashwise.repository.ExpenseRepository;
import com.leozara.cashwise.repository.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;
    private final ExpenseRepository expenseRepository;

    public List<Subscription> getAllSubscriptions(Long userId) {
        return subscriptionRepository.findByUserId(userId);
    }

    public Page<Subscription> getAllSubscriptions(Long userId, Pageable pageable) {
        return subscriptionRepository.findByUserId(userId, pageable);
    }

    public List<Subscription> getActiveSubscriptions(Long userId) {
        return subscriptionRepository.findByActiveTrueAndUserId(userId);
    }

    @Transactional
    public Subscription createSubscription(Subscription subscription, Long userId) {
        if (subscription.getNextDueDate() == null) {
            subscription.setNextDueDate(calculateNextDueDate(subscription));
        }
        if (subscription.getActive() == null) {
            subscription.setActive(true);
        }
        subscription.setUserId(userId);
        return subscriptionRepository.save(subscription);
    }

    @Transactional
    public Subscription updateSubscription(Long id, Subscription details, Long userId) {
        Subscription subscription = subscriptionRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Subscription not found with ID: " + id));

        subscription.setDescription(details.getDescription());
        subscription.setAmount(details.getAmount());
        subscription.setCurrency(details.getCurrency());
        subscription.setCategory(details.getCategory());
        subscription.setFrequency(details.getFrequency());
        subscription.setDayOfMonth(details.getDayOfMonth());

        if (details.getActive() != null) {
            subscription.setActive(details.getActive());
        }

        return subscriptionRepository.save(subscription);
    }

    @Transactional
    public void deleteSubscription(Long id, Long userId) {
        Subscription subscription = subscriptionRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Subscription not found with ID: " + id));
        subscriptionRepository.delete(subscription);
    }

    @Transactional
    public Subscription toggleActive(Long id, Long userId) {
        Subscription subscription = subscriptionRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Subscription not found with ID: " + id));

        subscription.setActive(!subscription.getActive());

        if (subscription.getActive()) {
            subscription.setNextDueDate(calculateNextDueDate(subscription));
        }

        return subscriptionRepository.save(subscription);
    }

    @Transactional
    public List<Expense> processSubscriptions(Long userId) {
        LocalDate today = LocalDate.now();
        List<Subscription> dueSubscriptions =
                subscriptionRepository.findByActiveTrueAndNextDueDateLessThanEqualAndUserId(today, userId);

        return processDueSubscriptions(dueSubscriptions);
    }

    @Transactional
    public List<Expense> processAllDueSubscriptions() {
        LocalDate today = LocalDate.now();
        List<Subscription> dueSubscriptions =
                subscriptionRepository.findByActiveTrueAndNextDueDateLessThanEqual(today);

        return processDueSubscriptions(dueSubscriptions);
    }

    private List<Expense> processDueSubscriptions(List<Subscription> dueSubscriptions) {
        List<Expense> createdExpenses = new ArrayList<>();

        for (Subscription sub : dueSubscriptions) {
            String groupId = "sub-" + sub.getId() + "-" + sub.getNextDueDate();

            if (expenseRepository.existsByGroupId(groupId)) {
                log.info("Skipping duplicate expense for subscription {} on {}",
                        sub.getId(), sub.getNextDueDate());
                sub.setNextDueDate(calculateNextAfter(sub, sub.getNextDueDate()));
                subscriptionRepository.save(sub);
                continue;
            }

            Expense expense = new Expense();
            expense.setDescription(sub.getDescription() + " (Subscription)");
            expense.setAmount(sub.getAmount());
            expense.setCurrency(sub.getCurrency());
            expense.setCategory(sub.getCategory());
            expense.setDate(sub.getNextDueDate());
            expense.setGroupId(groupId);
            expense.setUserId(sub.getUserId());

            Expense saved = expenseRepository.save(expense);
            createdExpenses.add(saved);

            log.info("Auto-created expense from subscription: {} - {} {}",
                    sub.getDescription(), sub.getAmount(), sub.getCurrency());

            sub.setNextDueDate(calculateNextAfter(sub, sub.getNextDueDate()));
            subscriptionRepository.save(sub);
        }

        return createdExpenses;
    }

    private LocalDate calculateNextDueDate(Subscription subscription) {
        LocalDate today = LocalDate.now();
        int day = Math.min(subscription.getDayOfMonth(), today.lengthOfMonth());

        LocalDate candidate = today.withDayOfMonth(day);

        if (!candidate.isAfter(today)) {
            candidate = calculateNextAfter(subscription, candidate);
        }

        return candidate;
    }

    private LocalDate calculateNextAfter(Subscription subscription, LocalDate from) {
        return switch (subscription.getFrequency()) {
            case "WEEKLY" -> from.plusWeeks(1);
            case "YEARLY" -> from.plusYears(1);
            default -> {
                LocalDate next = from.plusMonths(1);
                int day = Math.min(subscription.getDayOfMonth(), next.lengthOfMonth());
                yield next.withDayOfMonth(day);
            }
        };
    }
}
