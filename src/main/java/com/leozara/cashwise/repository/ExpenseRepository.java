package com.leozara.cashwise.repository;

import com.leozara.cashwise.model.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    // Métodos customizados (o Spring cria automaticamente!)

    // Buscar gastos por categoria
    List<Expense> findByCategory(String category);

    // Buscar gastos por data
    List<Expense> findByDate(LocalDate date);

    // Buscar gastos entre duas datas
    List<Expense> findByDateBetween(LocalDate startDate, LocalDate endDate);

    // Buscar gastos por moeda
    List<Expense> findByCurrency(String currency);
}