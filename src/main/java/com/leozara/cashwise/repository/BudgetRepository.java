package com.leozara.cashwise.repository;

import com.leozara.cashwise.model.Budget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BudgetRepository extends JpaRepository<Budget, Long> {

    List<Budget> findByHouseholdId(Long householdId);

    Optional<Budget> findByHouseholdIdAndCategory(Long householdId, String category);

    Optional<Budget> findByIdAndHouseholdId(Long id, Long householdId);

    boolean existsByHouseholdIdAndCategory(Long householdId, String category);

    void deleteByHouseholdId(Long householdId);
}
