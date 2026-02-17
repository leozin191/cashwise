package com.leozara.cashwise.controller;

import com.leozara.cashwise.model.Income;
import com.leozara.cashwise.security.AuthUtil;
import com.leozara.cashwise.service.IncomeService;
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
@RequestMapping("/api/incomes")
@RequiredArgsConstructor
public class IncomeController {

    private final IncomeService incomeService;

    @GetMapping
    public ResponseEntity<?> getAllIncomes(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        Long userId = AuthUtil.getCurrentUserId();
        if (page != null && size != null) {
            var pageable = PageRequest.of(page, Math.min(size, 200), Sort.by("date").descending());
            return ResponseEntity.ok(incomeService.getAllIncomes(userId, pageable));
        }
        return ResponseEntity.ok(incomeService.getAllIncomes(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Income> getIncomeById(@PathVariable Long id) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(incomeService.getIncomeById(id, userId));
    }

    @PostMapping
    public ResponseEntity<Income> createIncome(@Valid @RequestBody Income income) {
        Long userId = AuthUtil.getCurrentUserId();
        Income savedIncome = incomeService.createIncome(income, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedIncome);
    }

    @PostMapping("/bulk")
    public ResponseEntity<List<Income>> createMultipleIncomes(@Valid @RequestBody List<Income> incomes) {
        if (incomes == null || incomes.isEmpty()) {
            throw new IllegalArgumentException("Income list cannot be null or empty.");
        }
        Long userId = AuthUtil.getCurrentUserId();
        List<Income> savedIncomes = incomes.stream()
                .map(income -> incomeService.createIncome(income, userId))
                .toList();
        return ResponseEntity.status(HttpStatus.CREATED).body(savedIncomes);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Income> updateIncome(
            @PathVariable Long id,
            @Valid @RequestBody Income incomeDetails) {
        Long userId = AuthUtil.getCurrentUserId();
        Income updatedIncome = incomeService.updateIncome(id, incomeDetails, userId);
        return ResponseEntity.ok(updatedIncome);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteIncome(@PathVariable Long id) {
        Long userId = AuthUtil.getCurrentUserId();
        incomeService.deleteIncome(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/currency/{currency}")
    public ResponseEntity<List<Income>> getIncomesByCurrency(@PathVariable String currency) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(incomeService.getIncomesByCurrency(currency, userId));
    }

    @GetMapping("/date-range")
    public ResponseEntity<List<Income>> getIncomesByDateRange(
            @RequestParam LocalDate start,
            @RequestParam LocalDate end) {
        if (start.isAfter(end)) {
            return ResponseEntity.badRequest().build();
        }
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(incomeService.getIncomesByDateRange(start, end, userId));
    }

    @GetMapping("/date/{date}")
    public ResponseEntity<List<Income>> getIncomesByDate(@PathVariable LocalDate date) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(incomeService.getIncomesByDate(date, userId));
    }
}
