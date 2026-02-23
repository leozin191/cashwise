package com.leozara.cashwise.repository;

import com.leozara.cashwise.model.Income;
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
public interface IncomeRepository extends JpaRepository<Income, Long> {

    List<Income> findByUserId(Long userId);

    Page<Income> findByUserId(Long userId, Pageable pageable);

    Optional<Income> findByIdAndUserId(Long id, Long userId);

    List<Income> findByDateAndUserId(LocalDate date, Long userId);

    List<Income> findByDateBetweenAndUserId(LocalDate startDate, LocalDate endDate, Long userId);

    List<Income> findByCurrencyAndUserId(String currency, Long userId);

    @Modifying
    @Query("DELETE FROM Income i WHERE i.userId = :userId")
    void deleteByUserId(Long userId);

    List<Income> findByHouseholdId(Long householdId);

    Page<Income> findByHouseholdId(Long householdId, Pageable pageable);

    Optional<Income> findByIdAndHouseholdId(Long id, Long householdId);

    List<Income> findByDateBetweenAndHouseholdId(LocalDate startDate, LocalDate endDate, Long householdId);

    List<Income> findByCurrencyAndHouseholdId(String currency, Long householdId);

    List<Income> findByDateAndHouseholdId(LocalDate date, Long householdId);
}
