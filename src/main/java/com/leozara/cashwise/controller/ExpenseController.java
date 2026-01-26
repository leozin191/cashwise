package com.leozara.cashwise.controller;

import com.leozara.cashwise.model.Expense;
import com.leozara.cashwise.service.ExpenseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/expenses")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // Permite requisições do frontend
public class ExpenseController {

    private final ExpenseService expenseService;

    // GET /api/expenses - Lista todos os gastos
    @GetMapping
    public ResponseEntity<List<Expense>> getAllExpenses() {
        List<Expense> expenses = expenseService.getAllExpenses();
        return ResponseEntity.ok(expenses);
    }

    // GET /api/expenses/{id} - Busca um gasto específico
    @GetMapping("/{id}")
    public ResponseEntity<Expense> getExpenseById(@PathVariable Long id) {
        return expenseService.getExpenseById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // POST /api/expenses - Cria um novo gasto
    @PostMapping
    public ResponseEntity<Expense> createExpense(@RequestBody Expense expense) {
        Expense savedExpense = expenseService.createExpense(expense);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedExpense);
    }

    // PUT /api/expenses/{id} - Atualiza um gasto
    @PutMapping("/{id}")
    public ResponseEntity<Expense> updateExpense(
            @PathVariable Long id,
            @RequestBody Expense expenseDetails) {
        try {
            Expense updatedExpense = expenseService.updateExpense(id, expenseDetails);
            return ResponseEntity.ok(updatedExpense);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // DELETE /api/expenses/{id} - Deleta um gasto
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteExpense(@PathVariable Long id) {
        expenseService.deleteExpense(id);
        return ResponseEntity.noContent().build();
    }

    // GET /api/expenses/category/{category} - Busca por categoria
    @GetMapping("/category/{category}")
    public ResponseEntity<List<Expense>> getExpensesByCategory(@PathVariable String category) {
        List<Expense> expenses = expenseService.getExpensesByCategory(category);
        return ResponseEntity.ok(expenses);
    }

    // GET /api/expenses/currency/{currency} - Busca por moeda
    @GetMapping("/currency/{currency}")
    public ResponseEntity<List<Expense>> getExpensesByCurrency(@PathVariable String currency) {
        List<Expense> expenses = expenseService.getExpensesByCurrency(currency);
        return ResponseEntity.ok(expenses);
    }

    // GET /api/expenses/date-range?start=2026-01-01&end=2026-01-31
    @GetMapping("/date-range")
    public ResponseEntity<List<Expense>> getExpensesByDateRange(
            @RequestParam LocalDate start,
            @RequestParam LocalDate end) {
        List<Expense> expenses = expenseService.getExpensesByDateRange(start, end);
        return ResponseEntity.ok(expenses);
    }
}