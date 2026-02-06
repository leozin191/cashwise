package com.leozara.cashwise.service;

import com.leozara.cashwise.model.Expense;
import com.leozara.cashwise.model.Subscription;
import com.leozara.cashwise.repository.ExpenseRepository;
import com.leozara.cashwise.repository.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;
    private final ExpenseRepository expenseRepository;

    // CRUD
    public List<Subscription> getAllSubscriptions() {
        return subscriptionRepository.findAll();
    }

    public List<Subscription> getActiveSubscriptions() {
        return subscriptionRepository.findByActiveTrue();
    }

    public Subscription createSubscription(Subscription subscription) {
        // Calcula a próxima data se não foi informada
        if (subscription.getNextDueDate() == null) {
            subscription.setNextDueDate(calculateNextDueDate(subscription));
        }
        if (subscription.getActive() == null) {
            subscription.setActive(true);
        }
        return subscriptionRepository.save(subscription);
    }

    public Subscription updateSubscription(Long id, Subscription details) {
        Subscription subscription = subscriptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Subscription not found: " + id));

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

    public void deleteSubscription(Long id) {
        subscriptionRepository.deleteById(id);
    }

    public Subscription toggleActive(Long id) {
        Subscription subscription = subscriptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Subscription not found: " + id));

        subscription.setActive(!subscription.getActive());

        // Se reativou, recalcula próxima data
        if (subscription.getActive()) {
            subscription.setNextDueDate(calculateNextDueDate(subscription));
        }

        return subscriptionRepository.save(subscription);
    }

    // Processa subscriptions vencidas e cria despesas automaticamente
    public List<Expense> processSubscriptions() {
        LocalDate today = LocalDate.now();
        List<Subscription> dueSubscriptions =
                subscriptionRepository.findByActiveTrueAndNextDueDateLessThanEqual(today);

        List<Expense> createdExpenses = new ArrayList<>();

        for (Subscription sub : dueSubscriptions) {
            // Cria a despesa
            Expense expense = new Expense();
            expense.setDescription(sub.getDescription() + " (Subscription)");
            expense.setAmount(sub.getAmount());
            expense.setCurrency(sub.getCurrency());
            expense.setCategory(sub.getCategory());
            expense.setDate(sub.getNextDueDate());

            Expense saved = expenseRepository.save(expense);
            createdExpenses.add(saved);

            log.info("Auto-created expense from subscription: {} - {} {}",
                    sub.getDescription(), sub.getAmount(), sub.getCurrency());

            // Atualiza próxima data
            sub.setNextDueDate(calculateNextAfter(sub, sub.getNextDueDate()));
            subscriptionRepository.save(sub);
        }

        return createdExpenses;
    }

    // Calcula próxima data baseado na frequência
    private LocalDate calculateNextDueDate(Subscription subscription) {
        LocalDate today = LocalDate.now();
        int day = Math.min(subscription.getDayOfMonth(), today.lengthOfMonth());

        LocalDate candidate = today.withDayOfMonth(day);

        // Se já passou esse dia no mês atual, vai pro próximo período
        if (!candidate.isAfter(today)) {
            candidate = calculateNextAfter(subscription, candidate);
        }

        return candidate;
    }

    private LocalDate calculateNextAfter(Subscription subscription, LocalDate from) {
        return switch (subscription.getFrequency()) {
            case "WEEKLY" -> from.plusWeeks(1);
            case "YEARLY" -> from.plusYears(1);
            default -> { // MONTHLY
                LocalDate next = from.plusMonths(1);
                int day = Math.min(subscription.getDayOfMonth(), next.lengthOfMonth());
                yield next.withDayOfMonth(day);
            }
        };
    }
}