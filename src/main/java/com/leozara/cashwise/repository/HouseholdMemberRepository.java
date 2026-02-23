package com.leozara.cashwise.repository;

import com.leozara.cashwise.model.HouseholdMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HouseholdMemberRepository extends JpaRepository<HouseholdMember, Long> {

    Optional<HouseholdMember> findByUserId(Long userId);

    List<HouseholdMember> findByHouseholdId(Long householdId);

    Optional<HouseholdMember> findByHouseholdIdAndUserId(Long householdId, Long userId);

    boolean existsByUserId(Long userId);

    void deleteByUserId(Long userId);
}
