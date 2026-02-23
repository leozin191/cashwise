package com.leozara.cashwise.controller;

import com.leozara.cashwise.dto.IncomeCreateRequest;
import com.leozara.cashwise.dto.IncomeResponse;
import com.leozara.cashwise.dto.IncomeUpdateRequest;
import com.leozara.cashwise.security.AuthUtil;
import com.leozara.cashwise.service.IncomeService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/incomes")
@RequiredArgsConstructor
@Validated
public class IncomeController {

    private final IncomeService incomeService;

    @GetMapping
    public ResponseEntity<?> getAllIncomes(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        Long userId = AuthUtil.getCurrentUserId();
        if (page != null && size != null) {
            var pageable = PageRequest.of(page, Math.min(size, 50), Sort.by("date").descending());
            return ResponseEntity.ok(incomeService.getAllIncomes(userId, pageable));
        }
        return ResponseEntity.ok(incomeService.getAllIncomes(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<IncomeResponse> getIncomeById(@PathVariable Long id) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(incomeService.getIncomeById(id, userId));
    }

    @PostMapping
    public ResponseEntity<IncomeResponse> createIncome(@Valid @RequestBody IncomeCreateRequest income) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.status(HttpStatus.CREATED).body(incomeService.createIncome(income, userId));
    }

    @PostMapping("/bulk")
    public ResponseEntity<List<IncomeResponse>> createMultipleIncomes(
            @RequestBody @Size(min = 1, max = 500, message = "Bulk import must contain between 1 and 500 items")
            List<@Valid IncomeCreateRequest> incomes) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.status(HttpStatus.CREATED).body(incomeService.createIncomes(incomes, userId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<IncomeResponse> updateIncome(
            @PathVariable Long id,
            @Valid @RequestBody IncomeUpdateRequest incomeDetails) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(incomeService.updateIncome(id, incomeDetails, userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteIncome(@PathVariable Long id) {
        Long userId = AuthUtil.getCurrentUserId();
        incomeService.deleteIncome(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/currency/{currency}")
    public ResponseEntity<List<IncomeResponse>> getIncomesByCurrency(@PathVariable String currency) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(incomeService.getIncomesByCurrency(currency, userId));
    }

    @GetMapping("/date-range")
    public ResponseEntity<List<IncomeResponse>> getIncomesByDateRange(
            @RequestParam LocalDate start,
            @RequestParam LocalDate end) {
        if (start.isAfter(end)) {
            return ResponseEntity.badRequest().build();
        }
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(incomeService.getIncomesByDateRange(start, end, userId));
    }

    @GetMapping("/date/{date}")
    public ResponseEntity<List<IncomeResponse>> getIncomesByDate(@PathVariable LocalDate date) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(incomeService.getIncomesByDate(date, userId));
    }
}
