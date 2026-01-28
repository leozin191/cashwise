package com.leozara.cashwise.service;

import com.leozara.cashwise.model.Expense;
import com.leozara.cashwise.repository.ExpenseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final AiService aiService;

    // Criar novo gasto
    public Expense createExpense(Expense expense) {
        if (expense.getCategory() == null || expense.getCategory().isEmpty()) {
            String suggestedCategory = aiService.suggestCategory(expense.getDescription());
            expense.setCategory(suggestedCategory);
        }
        return expenseRepository.save(expense);
    }

    // Buscar todos os gastos
    public List<Expense> getAllExpenses() {
        return expenseRepository.findAll();
    }

    // Buscar gasto por ID
    public Optional<Expense> getExpenseById(Long id) {
        return expenseRepository.findById(id);
    }

    // Atualizar gasto
    public Expense updateExpense(Long id, Expense expenseDetails) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Gasto não encontrado com ID: " + id));

        expense.setDescription(expenseDetails.getDescription());
        expense.setAmount(expenseDetails.getAmount());
        expense.setCurrency(expenseDetails.getCurrency());
        expense.setDate(expenseDetails.getDate());
        expense.setCategory(expenseDetails.getCategory());

        return expenseRepository.save(expense);
    }

    // Deletar gasto
    public void deleteExpense(Long id) {
        expenseRepository.deleteById(id);
    }

    // Buscar por categoria
    public List<Expense> getExpensesByCategory(String category) {
        return expenseRepository.findByCategory(category);
    }

    // Buscar por período
    public List<Expense> getExpensesByDateRange(LocalDate startDate, LocalDate endDate) {
        return expenseRepository.findByDateBetween(startDate, endDate);
    }

    // Buscar por moeda
    public List<Expense> getExpensesByCurrency(String currency) {
        return expenseRepository.findByCurrency(currency);
    }

    public List<Expense> getExpensesByDate(LocalDate date) {
        return expenseRepository.findByDate(date);
    }
}