package com.leozara.cashwise.service;

import com.leozara.cashwise.dto.ExpenseResponse;
import com.leozara.cashwise.dto.SubscriptionCreateRequest;
import com.leozara.cashwise.dto.SubscriptionResponse;
import com.leozara.cashwise.dto.SubscriptionUpdateRequest;
import com.leozara.cashwise.exception.ResourceNotFoundException;
import com.leozara.cashwise.model.Expense;
import com.leozara.cashwise.model.HouseholdMember;
import com.leozara.cashwise.model.Subscription;
import com.leozara.cashwise.repository.ExpenseRepository;
import com.leozara.cashwise.repository.HouseholdMemberRepository;
import com.leozara.cashwise.repository.SubscriptionRepository;
import com.leozara.cashwise.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;
    private final ExpenseRepository expenseRepository;
    private final HouseholdMemberRepository memberRepository;
    private final UserRepository userRepository;

    private Long getHouseholdId(Long userId) {
        return memberRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalStateException("You are not part of any household"))
                .getHouseholdId();
    }

    private ExpenseResponse toExpenseResponse(Expense expense) {
        ExpenseResponse resp = new ExpenseResponse();
        resp.setId(expense.getId());
        resp.setDescription(expense.getDescription());
        resp.setAmount(expense.getAmount());
        resp.setCurrency(expense.getCurrency());
        resp.setDate(expense.getDate());
        resp.setCategory(expense.getCategory());
        resp.setGroupId(expense.getGroupId());
        resp.setUserId(expense.getUserId());
        resp.setHouseholdId(expense.getHouseholdId());
        resp.setCreatedAt(expense.getCreatedAt());
        userRepository.findById(expense.getUserId()).ifPresent(u -> {
            resp.setAddedByName(u.getName());
            resp.setAddedByUsername(u.getUsername());
        });
        return resp;
    }

    private SubscriptionResponse toResponse(Subscription sub) {
        SubscriptionResponse resp = new SubscriptionResponse();
        resp.setId(sub.getId());
        resp.setDescription(sub.getDescription());
        resp.setAmount(sub.getAmount());
        resp.setCurrency(sub.getCurrency());
        resp.setCategory(sub.getCategory());
        resp.setFrequency(sub.getFrequency());
        resp.setDayOfMonth(sub.getDayOfMonth());
        resp.setActive(sub.getActive());
        resp.setNextDueDate(sub.getNextDueDate());
        resp.setUserId(sub.getUserId());
        resp.setHouseholdId(sub.getHouseholdId());
        resp.setCreatedAt(sub.getCreatedAt());
        userRepository.findById(sub.getUserId()).ifPresent(u -> {
            resp.setAddedByName(u.getName());
            resp.setAddedByUsername(u.getUsername());
        });
        return resp;
    }

    private void checkCanEdit(Long currentUserId, Subscription sub) {
        HouseholdMember member = memberRepository.findByUserId(currentUserId)
                .orElseThrow(() -> new AccessDeniedException("Not a household member"));
        if (!"OWNER".equals(member.getRole()) && !currentUserId.equals(sub.getUserId())) {
            throw new AccessDeniedException("You can only modify your own entries");
        }
    }

    public List<SubscriptionResponse> getAllSubscriptions(Long userId) {
        Long householdId = getHouseholdId(userId);
        return subscriptionRepository.findByHouseholdId(householdId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    public Page<SubscriptionResponse> getAllSubscriptions(Long userId, Pageable pageable) {
        Long householdId = getHouseholdId(userId);
        Page<Subscription> page = subscriptionRepository.findByHouseholdId(householdId, pageable);
        List<SubscriptionResponse> content = page.getContent().stream()
                .map(this::toResponse).collect(Collectors.toList());
        return new PageImpl<>(content, pageable, page.getTotalElements());
    }

    public List<SubscriptionResponse> getActiveSubscriptions(Long userId) {
        Long householdId = getHouseholdId(userId);
        return subscriptionRepository.findByActiveTrueAndHouseholdId(householdId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public SubscriptionResponse createSubscription(SubscriptionCreateRequest request, Long userId) {
        return toResponse(subscriptionRepository.save(buildNewSubscription(request, userId)));
    }

    @Transactional
    public List<SubscriptionResponse> createSubscriptions(List<SubscriptionCreateRequest> requests, Long userId) {
        List<SubscriptionResponse> results = new ArrayList<>(requests.size());
        for (SubscriptionCreateRequest request : requests) {
            results.add(toResponse(subscriptionRepository.save(buildNewSubscription(request, userId))));
        }
        return results;
    }

    private Subscription buildNewSubscription(SubscriptionCreateRequest request, Long userId) {
        Long householdId = getHouseholdId(userId);
        Subscription subscription = new Subscription();
        subscription.setDescription(request.getDescription());
        subscription.setAmount(request.getAmount());
        subscription.setCurrency(request.getCurrency());
        subscription.setCategory(request.getCategory());
        subscription.setFrequency(request.getFrequency());
        subscription.setDayOfMonth(request.getDayOfMonth());
        subscription.setUserId(userId);
        subscription.setHouseholdId(householdId);
        subscription.setActive(request.getActive() == null ? true : request.getActive());

        if (subscription.getNextDueDate() == null) {
            subscription.setNextDueDate(calculateNextDueDate(subscription));
        }
        return subscription;
    }

    @Transactional
    public SubscriptionResponse updateSubscription(Long id, SubscriptionUpdateRequest details, Long userId) {
        Long householdId = getHouseholdId(userId);
        Subscription subscription = subscriptionRepository.findByIdAndHouseholdId(id, householdId)
                .orElseThrow(() -> new ResourceNotFoundException("Subscription not found with ID: " + id));
        checkCanEdit(userId, subscription);

        String previousFrequency = subscription.getFrequency();
        Integer previousDayOfMonth = subscription.getDayOfMonth();
        Boolean previousActive = subscription.getActive();

        subscription.setDescription(details.getDescription());
        subscription.setAmount(details.getAmount());
        subscription.setCurrency(details.getCurrency());
        subscription.setCategory(details.getCategory());
        subscription.setFrequency(details.getFrequency());
        subscription.setDayOfMonth(details.getDayOfMonth());

        if (details.getActive() != null) {
            subscription.setActive(details.getActive());
        }

        boolean scheduleChanged = !Objects.equals(previousFrequency, subscription.getFrequency())
                || !Objects.equals(previousDayOfMonth, subscription.getDayOfMonth());
        boolean reactivated = !Boolean.TRUE.equals(previousActive) && Boolean.TRUE.equals(subscription.getActive());

        if (Boolean.TRUE.equals(subscription.getActive()) && (scheduleChanged || reactivated)) {
            subscription.setNextDueDate(calculateNextDueDate(subscription));
        }

        return toResponse(subscriptionRepository.save(subscription));
    }

    @Transactional
    public void deleteSubscription(Long id, Long userId) {
        Long householdId = getHouseholdId(userId);
        Subscription subscription = subscriptionRepository.findByIdAndHouseholdId(id, householdId)
                .orElseThrow(() -> new ResourceNotFoundException("Subscription not found with ID: " + id));
        checkCanEdit(userId, subscription);
        subscriptionRepository.delete(subscription);
    }

    @Transactional
    public SubscriptionResponse toggleActive(Long id, Long userId) {
        Long householdId = getHouseholdId(userId);
        Subscription subscription = subscriptionRepository.findByIdAndHouseholdId(id, householdId)
                .orElseThrow(() -> new ResourceNotFoundException("Subscription not found with ID: " + id));
        checkCanEdit(userId, subscription);

        subscription.setActive(!subscription.getActive());

        if (subscription.getActive()) {
            subscription.setNextDueDate(calculateNextDueDate(subscription));
        }

        return toResponse(subscriptionRepository.save(subscription));
    }

    @Transactional
    public List<ExpenseResponse> processSubscriptions(Long userId) {
        LocalDate today = LocalDate.now();
        Long householdId = getHouseholdId(userId);
        List<Subscription> dueSubscriptions =
                subscriptionRepository.findByActiveTrueAndNextDueDateLessThanEqualAndHouseholdId(today, householdId);
        return processDueSubscriptions(dueSubscriptions).stream()
                .map(this::toExpenseResponse).collect(Collectors.toList());
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
            expense.setHouseholdId(sub.getHouseholdId());

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
            case "YEARLY" -> from.plusYears(1);
            case "MONTHLY" -> {
                LocalDate next = from.plusMonths(1);
                int day = Math.min(subscription.getDayOfMonth(), next.lengthOfMonth());
                yield next.withDayOfMonth(day);
            }
            default -> throw new IllegalArgumentException(
                    "Unsupported subscription frequency: " + subscription.getFrequency());
        };
    }
}
