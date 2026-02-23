package com.leozara.cashwise.repository;

import com.leozara.cashwise.model.Expense;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    List<Expense> findByUserId(Long userId);

    Page<Expense> findByUserId(Long userId, Pageable pageable);

    Optional<Expense> findByIdAndUserId(Long id, Long userId);

    List<Expense> findByCategoryAndUserId(String category, Long userId);

    List<Expense> findByDateAndUserId(LocalDate date, Long userId);

    List<Expense> findByDateBetweenAndUserId(LocalDate startDate, LocalDate endDate, Long userId);

    List<Expense> findByCurrencyAndUserId(String currency, Long userId);

    boolean existsByGroupId(String groupId);

    @Modifying
    @Query("DELETE FROM Expense e WHERE e.userId = :userId")
    void deleteByUserId(Long userId);

    List<Expense> findByHouseholdId(Long householdId);

    Page<Expense> findByHouseholdId(Long householdId, Pageable pageable);

    Optional<Expense> findByIdAndHouseholdId(Long id, Long householdId);

    List<Expense> findByCategoryAndHouseholdId(String category, Long householdId);

    List<Expense> findByDateBetweenAndHouseholdId(LocalDate startDate, LocalDate endDate, Long householdId);

    List<Expense> findByCurrencyAndHouseholdId(String currency, Long householdId);

    List<Expense> findByDateAndHouseholdId(LocalDate date, Long householdId);
}
