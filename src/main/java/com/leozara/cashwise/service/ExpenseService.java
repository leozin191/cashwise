package com.leozara.cashwise.service;

import com.leozara.cashwise.exception.ResourceNotFoundException;
import com.leozara.cashwise.model.Expense;
import com.leozara.cashwise.repository.ExpenseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final AiService aiService;

    @Transactional
    public Expense createExpense(Expense expense, Long userId) {
        if (expense.getCategory() == null || expense.getCategory().isEmpty()) {
            String suggestedCategory = aiService.suggestCategory(expense.getDescription());
            expense.setCategory(suggestedCategory);
        }
        expense.setUserId(userId);
        return expenseRepository.save(expense);
    }

    public List<Expense> getAllExpenses(Long userId) {
        return expenseRepository.findByUserId(userId);
    }

    public Page<Expense> getAllExpenses(Long userId, Pageable pageable) {
        return expenseRepository.findByUserId(userId, pageable);
    }

    public Expense getExpenseById(Long id, Long userId) {
        return expenseRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with ID: " + id));
    }

    @Transactional
    public Expense updateExpense(Long id, Expense expenseDetails, Long userId) {
        Expense expense = expenseRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with ID: " + id));

        expense.setDescription(expenseDetails.getDescription());
        expense.setAmount(expenseDetails.getAmount());
        expense.setCurrency(expenseDetails.getCurrency());
        expense.setDate(expenseDetails.getDate());
        expense.setCategory(expenseDetails.getCategory());
        expense.setGroupId(expenseDetails.getGroupId());

        return expenseRepository.save(expense);
    }

    @Transactional
    public void deleteExpense(Long id, Long userId) {
        Expense expense = expenseRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with ID: " + id));
        expenseRepository.delete(expense);
    }

    public List<Expense> getExpensesByCategory(String category, Long userId) {
        return expenseRepository.findByCategoryAndUserId(category, userId);
    }

    public List<Expense> getExpensesByDateRange(LocalDate startDate, LocalDate endDate, Long userId) {
        return expenseRepository.findByDateBetweenAndUserId(startDate, endDate, userId);
    }

    public List<Expense> getExpensesByCurrency(String currency, Long userId) {
        return expenseRepository.findByCurrencyAndUserId(currency, userId);
    }

    public List<Expense> getExpensesByDate(LocalDate date, Long userId) {
        return expenseRepository.findByDateAndUserId(date, userId);
    }
}
