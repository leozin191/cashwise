package com.leozara.cashwise.controller;

import com.leozara.cashwise.dto.CategorySuggestionResponse;
import com.leozara.cashwise.model.Expense;
import com.leozara.cashwise.security.AuthUtil;
import com.leozara.cashwise.service.AiService;
import com.leozara.cashwise.service.ExpenseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/expenses")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseService expenseService;
    private final AiService aiService;

    @GetMapping
    public ResponseEntity<?> getAllExpenses(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        Long userId = AuthUtil.getCurrentUserId();
        if (page != null && size != null) {
            var pageable = PageRequest.of(page, Math.min(size, 200), Sort.by("date").descending());
            return ResponseEntity.ok(expenseService.getAllExpenses(userId, pageable));
        }
        return ResponseEntity.ok(expenseService.getAllExpenses(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Expense> getExpenseById(@PathVariable Long id) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(expenseService.getExpenseById(id, userId));
    }

    @PostMapping
    public ResponseEntity<Expense> createExpense(@Valid @RequestBody Expense expense) {
        Long userId = AuthUtil.getCurrentUserId();
        Expense savedExpense = expenseService.createExpense(expense, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedExpense);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Expense> updateExpense(
            @PathVariable Long id,
            @Valid @RequestBody Expense expenseDetails) {
        Long userId = AuthUtil.getCurrentUserId();
        Expense updatedExpense = expenseService.updateExpense(id, expenseDetails, userId);
        return ResponseEntity.ok(updatedExpense);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteExpense(@PathVariable Long id) {
        Long userId = AuthUtil.getCurrentUserId();
        expenseService.deleteExpense(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<List<Expense>> getExpensesByCategory(@PathVariable String category) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(expenseService.getExpensesByCategory(category, userId));
    }

    @GetMapping("/currency/{currency}")
    public ResponseEntity<List<Expense>> getExpensesByCurrency(@PathVariable String currency) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(expenseService.getExpensesByCurrency(currency, userId));
    }

    @GetMapping("/date-range")
    public ResponseEntity<List<Expense>> getExpensesByDateRange(
            @RequestParam LocalDate start,
            @RequestParam LocalDate end) {
        if (start.isAfter(end)) {
            return ResponseEntity.badRequest().build();
        }
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(expenseService.getExpensesByDateRange(start, end, userId));
    }

    @GetMapping("/date/{date}")
    public ResponseEntity<List<Expense>> getExpensesByDate(@PathVariable LocalDate date) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(expenseService.getExpensesByDate(date, userId));
    }

    @PostMapping("/bulk")
    public ResponseEntity<List<Expense>> createMultipleExpenses(@Valid @RequestBody List<Expense> expenses) {
        if (expenses == null || expenses.isEmpty()) {
            throw new IllegalArgumentException("Expense list cannot be null or empty.");
        }
        Long userId = AuthUtil.getCurrentUserId();
        List<Expense> savedExpenses = expenses.stream()
                .map(expense -> expenseService.createExpense(expense, userId))
                .toList();
        return ResponseEntity.status(HttpStatus.CREATED).body(savedExpenses);
    }

    @GetMapping("/suggest-category")
    public ResponseEntity<CategorySuggestionResponse> suggestCategory(
            @RequestParam String description) {
        if (description == null || description.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        String category = aiService.suggestCategory(description);
        CategorySuggestionResponse response =
                new CategorySuggestionResponse(description, category);
        return ResponseEntity.ok(response);
    }
}
