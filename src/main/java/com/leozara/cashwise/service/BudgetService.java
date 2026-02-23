package com.leozara.cashwise.service;

import com.leozara.cashwise.dto.BudgetRequest;
import com.leozara.cashwise.dto.BudgetResponse;
import com.leozara.cashwise.model.Budget;
import com.leozara.cashwise.repository.BudgetRepository;
import com.leozara.cashwise.repository.HouseholdMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BudgetService {

    private final BudgetRepository budgetRepository;
    private final HouseholdMemberRepository memberRepository;

    private Long getHouseholdId(Long userId) {
        return memberRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalStateException("You are not part of any household"))
                .getHouseholdId();
    }

    private BudgetResponse toResponse(Budget b) {
        return new BudgetResponse(b.getId(), b.getCategory(), b.getMonthlyLimit(), b.getCurrency());
    }

    public List<BudgetResponse> getBudgets(Long userId) {
        Long householdId = getHouseholdId(userId);
        return budgetRepository.findByHouseholdId(householdId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public BudgetResponse createBudget(Long userId, BudgetRequest req) {
        Long householdId = getHouseholdId(userId);

        // Upsert: if a budget for this category already exists, update it
        Budget budget = budgetRepository
                .findByHouseholdIdAndCategory(householdId, req.getCategory())
                .orElseGet(() -> new Budget(householdId, userId, req.getCategory(), req.getMonthlyLimit(), req.getCurrency()));

        budget.setMonthlyLimit(req.getMonthlyLimit());
        budget.setCurrency(req.getCurrency());

        return toResponse(budgetRepository.save(budget));
    }

    @Transactional
    public BudgetResponse updateBudget(Long userId, Long budgetId, BudgetRequest req) {
        Long householdId = getHouseholdId(userId);
        Budget budget = budgetRepository.findByIdAndHouseholdId(budgetId, householdId)
                .orElseThrow(() -> new IllegalArgumentException("Budget not found"));

        budget.setMonthlyLimit(req.getMonthlyLimit());
        budget.setCurrency(req.getCurrency());

        return toResponse(budgetRepository.save(budget));
    }

    @Transactional
    public void deleteBudget(Long userId, Long budgetId) {
        Long householdId = getHouseholdId(userId);
        Budget budget = budgetRepository.findByIdAndHouseholdId(budgetId, householdId)
                .orElseThrow(() -> new IllegalArgumentException("Budget not found"));
        budgetRepository.delete(budget);
    }
}
