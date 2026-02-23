package com.leozara.cashwise.controller;

import com.leozara.cashwise.dto.BudgetRequest;
import com.leozara.cashwise.dto.BudgetResponse;
import com.leozara.cashwise.security.AuthUtil;
import com.leozara.cashwise.service.BudgetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/budgets")
@RequiredArgsConstructor
public class BudgetController {

    private final BudgetService budgetService;

    @GetMapping
    public ResponseEntity<List<BudgetResponse>> getBudgets() {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(budgetService.getBudgets(userId));
    }

    @PostMapping
    public ResponseEntity<BudgetResponse> createBudget(@Valid @RequestBody BudgetRequest request) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.status(HttpStatus.CREATED).body(budgetService.createBudget(userId, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BudgetResponse> updateBudget(@PathVariable Long id,
                                                        @Valid @RequestBody BudgetRequest request) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(budgetService.updateBudget(userId, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBudget(@PathVariable Long id) {
        Long userId = AuthUtil.getCurrentUserId();
        budgetService.deleteBudget(userId, id);
        return ResponseEntity.noContent().build();
    }
}
