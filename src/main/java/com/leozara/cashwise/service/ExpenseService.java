package com.leozara.cashwise.service;

import com.leozara.cashwise.dto.ExpenseCreateRequest;
import com.leozara.cashwise.dto.ExpenseResponse;
import com.leozara.cashwise.dto.ExpenseUpdateRequest;
import com.leozara.cashwise.exception.ResourceNotFoundException;
import com.leozara.cashwise.model.Expense;
import com.leozara.cashwise.model.HouseholdMember;
import com.leozara.cashwise.model.User;
import com.leozara.cashwise.repository.ExpenseRepository;
import com.leozara.cashwise.repository.HouseholdMemberRepository;
import com.leozara.cashwise.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final HouseholdMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final AiService aiService;

    private Long getHouseholdId(Long userId) {
        return memberRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalStateException("You are not part of any household"))
                .getHouseholdId();
    }

    private ExpenseResponse toResponse(Expense expense) {
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

    private void checkCanEdit(Long currentUserId, Expense expense) {
        HouseholdMember member = memberRepository.findByUserId(currentUserId)
                .orElseThrow(() -> new AccessDeniedException("Not a household member"));
        if (!"OWNER".equals(member.getRole()) && !currentUserId.equals(expense.getUserId())) {
            throw new AccessDeniedException("You can only modify your own entries");
        }
    }

    @Transactional
    public ExpenseResponse createExpense(ExpenseCreateRequest request, Long userId) {
        Expense expense = buildNewExpense(request, userId);
        ExpenseResponse response = toResponse(expenseRepository.save(expense));
        aiService.invalidateInsightsCache(userId);
        return response;
    }

    @Transactional
    public List<ExpenseResponse> createExpenses(List<ExpenseCreateRequest> requests, Long userId) {
        List<ExpenseResponse> results = new ArrayList<>(requests.size());
        for (ExpenseCreateRequest request : requests) {
            results.add(toResponse(expenseRepository.save(buildNewExpense(request, userId))));
        }
        aiService.invalidateInsightsCache(userId);
        return results;
    }

    public List<ExpenseResponse> getAllExpenses(Long userId) {
        Long householdId = getHouseholdId(userId);
        return expenseRepository.findByHouseholdId(householdId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    public Page<ExpenseResponse> getAllExpenses(Long userId, Pageable pageable) {
        Long householdId = getHouseholdId(userId);
        Page<Expense> page = expenseRepository.findByHouseholdId(householdId, pageable);
        List<ExpenseResponse> content = page.getContent().stream()
                .map(this::toResponse).collect(Collectors.toList());
        return new PageImpl<>(content, pageable, page.getTotalElements());
    }

    public ExpenseResponse getExpenseById(Long id, Long userId) {
        Long householdId = getHouseholdId(userId);
        Expense expense = expenseRepository.findByIdAndHouseholdId(id, householdId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with ID: " + id));
        return toResponse(expense);
    }

    @Transactional
    public ExpenseResponse updateExpense(Long id, ExpenseUpdateRequest expenseDetails, Long userId) {
        Long householdId = getHouseholdId(userId);
        Expense expense = expenseRepository.findByIdAndHouseholdId(id, householdId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with ID: " + id));
        checkCanEdit(userId, expense);

        expense.setDescription(expenseDetails.getDescription());
        expense.setAmount(expenseDetails.getAmount());
        expense.setCurrency(expenseDetails.getCurrency());
        expense.setDate(expenseDetails.getDate());
        if (StringUtils.hasText(expenseDetails.getCategory())) {
            expense.setCategory(expenseDetails.getCategory());
        }
        if (expenseDetails.getGroupId() != null) {
            expense.setGroupId(StringUtils.hasText(expenseDetails.getGroupId()) ? expenseDetails.getGroupId() : null);
        }

        ExpenseResponse response = toResponse(expenseRepository.save(expense));
        aiService.invalidateInsightsCache(userId);
        return response;
    }

    @Transactional
    public void deleteExpense(Long id, Long userId) {
        Long householdId = getHouseholdId(userId);
        Expense expense = expenseRepository.findByIdAndHouseholdId(id, householdId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with ID: " + id));
        checkCanEdit(userId, expense);
        expenseRepository.delete(expense);
        aiService.invalidateInsightsCache(userId);
    }

    public List<ExpenseResponse> getExpensesByCategory(String category, Long userId) {
        Long householdId = getHouseholdId(userId);
        return expenseRepository.findByCategoryAndHouseholdId(category, householdId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    public List<ExpenseResponse> getExpensesByDateRange(LocalDate startDate, LocalDate endDate, Long userId) {
        Long householdId = getHouseholdId(userId);
        return expenseRepository.findByDateBetweenAndHouseholdId(startDate, endDate, householdId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    public List<ExpenseResponse> getExpensesByCurrency(String currency, Long userId) {
        Long householdId = getHouseholdId(userId);
        return expenseRepository.findByCurrencyAndHouseholdId(currency, householdId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    public List<ExpenseResponse> getExpensesByDate(LocalDate date, Long userId) {
        Long householdId = getHouseholdId(userId);
        return expenseRepository.findByDateAndHouseholdId(date, householdId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    private Expense buildNewExpense(ExpenseCreateRequest request, Long userId) {
        Long householdId = getHouseholdId(userId);
        Expense expense = new Expense();
        expense.setDescription(request.getDescription());
        expense.setAmount(request.getAmount());
        expense.setCurrency(request.getCurrency());
        expense.setDate(request.getDate());
        expense.setGroupId(StringUtils.hasText(request.getGroupId()) ? request.getGroupId() : null);
        expense.setUserId(userId);
        expense.setHouseholdId(householdId);

        if (StringUtils.hasText(request.getCategory())) {
            expense.setCategory(request.getCategory());
        } else {
            expense.setCategory(aiService.suggestCategory(request.getDescription()));
        }

        return expense;
    }
}
