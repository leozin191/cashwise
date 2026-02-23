package com.leozara.cashwise.repository;

import com.leozara.cashwise.model.Household;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface HouseholdRepository extends JpaRepository<Household, Long> {

    Optional<Household> findByCreatedBy(Long userId);
}
