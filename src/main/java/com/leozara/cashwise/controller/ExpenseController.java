package com.leozara.cashwise.controller;

import com.leozara.cashwise.dto.CategorySuggestionResponse;
import com.leozara.cashwise.dto.ExpenseCreateRequest;
import com.leozara.cashwise.dto.ExpenseResponse;
import com.leozara.cashwise.dto.ExpenseUpdateRequest;
import com.leozara.cashwise.dto.SubscriptionCreateRequest;
import com.leozara.cashwise.security.AuthUtil;
import com.leozara.cashwise.service.AiService;
import com.leozara.cashwise.service.ExpenseService;
import com.leozara.cashwise.service.SubscriptionService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/expenses")
@RequiredArgsConstructor
@Slf4j
@Validated
public class ExpenseController {

    private final ExpenseService expenseService;
    private final SubscriptionService subscriptionService;
    private final AiService aiService;

    private static final String SUBSCRIPTION_CATEGORY = "Subscriptions";

    @GetMapping
    public ResponseEntity<?> getAllExpenses(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        Long userId = AuthUtil.getCurrentUserId();
        if (page != null && size != null) {
            var pageable = PageRequest.of(page, Math.min(size, 50), Sort.by("date").descending());
            return ResponseEntity.ok(expenseService.getAllExpenses(userId, pageable));
        }
        return ResponseEntity.ok(expenseService.getAllExpenses(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ExpenseResponse> getExpenseById(@PathVariable Long id) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(expenseService.getExpenseById(id, userId));
    }

    @PostMapping
    public ResponseEntity<ExpenseResponse> createExpense(@Valid @RequestBody ExpenseCreateRequest request) {
        Long userId = AuthUtil.getCurrentUserId();
        ExpenseResponse savedExpense = expenseService.createExpense(request, userId);

        boolean isSubscriptionCategory = SUBSCRIPTION_CATEGORY.equalsIgnoreCase(savedExpense.getCategory());
        boolean hasFrequency = request.getFrequency() != null;

        if (isSubscriptionCategory || hasFrequency) {
            try {
                String frequency = request.getFrequency() != null ? request.getFrequency() : "MONTHLY";
                int dayOfMonth = request.getDayOfMonth() != null
                        ? request.getDayOfMonth()
                        : request.getDate().getDayOfMonth();

                SubscriptionCreateRequest subRequest = new SubscriptionCreateRequest();
                subRequest.setDescription(request.getDescription());
                subRequest.setAmount(request.getAmount());
                subRequest.setCurrency(request.getCurrency());
                subRequest.setCategory(savedExpense.getCategory());
                subRequest.setFrequency(frequency);
                subRequest.setDayOfMonth(dayOfMonth);
                subRequest.setActive(true);

                subscriptionService.createSubscription(subRequest, userId);
                log.info("Auto-created subscription from expense: {} ({})", request.getDescription(), frequency);
            } catch (Exception e) {
                log.warn("Failed to auto-create subscription from expense {}: {}", savedExpense.getId(), e.getMessage());
            }
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(savedExpense);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ExpenseResponse> updateExpense(
            @PathVariable Long id,
            @Valid @RequestBody ExpenseUpdateRequest expenseDetails) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(expenseService.updateExpense(id, expenseDetails, userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteExpense(@PathVariable Long id) {
        Long userId = AuthUtil.getCurrentUserId();
        expenseService.deleteExpense(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<List<ExpenseResponse>> getExpensesByCategory(@PathVariable String category) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(expenseService.getExpensesByCategory(category, userId));
    }

    @GetMapping("/currency/{currency}")
    public ResponseEntity<List<ExpenseResponse>> getExpensesByCurrency(@PathVariable String currency) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(expenseService.getExpensesByCurrency(currency, userId));
    }

    @GetMapping("/date-range")
    public ResponseEntity<List<ExpenseResponse>> getExpensesByDateRange(
            @RequestParam LocalDate start,
            @RequestParam LocalDate end) {
        if (start.isAfter(end)) {
            return ResponseEntity.badRequest().build();
        }
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(expenseService.getExpensesByDateRange(start, end, userId));
    }

    @GetMapping("/date/{date}")
    public ResponseEntity<List<ExpenseResponse>> getExpensesByDate(@PathVariable LocalDate date) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(expenseService.getExpensesByDate(date, userId));
    }

    @PostMapping("/bulk")
    public ResponseEntity<List<ExpenseResponse>> createMultipleExpenses(
            @RequestBody @Size(min = 1, max = 500, message = "Bulk import must contain between 1 and 500 items")
            List<@Valid ExpenseCreateRequest> expenses) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.status(HttpStatus.CREATED).body(expenseService.createExpenses(expenses, userId));
    }

    @GetMapping("/suggest-category")
    public ResponseEntity<CategorySuggestionResponse> suggestCategory(
            @RequestParam @Size(min = 1, max = 200) String description) {
        if (description.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        String category = aiService.suggestCategory(description);
        return ResponseEntity.ok(new CategorySuggestionResponse(description, category));
    }
}
