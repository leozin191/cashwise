package com.leozara.cashwise.repository;

import com.leozara.cashwise.model.HouseholdInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HouseholdInvitationRepository extends JpaRepository<HouseholdInvitation, Long> {

    Optional<HouseholdInvitation> findByToken(String token);

    List<HouseholdInvitation> findByEmailAndStatus(String email, String status);

    List<HouseholdInvitation> findByHouseholdId(Long householdId);

    void deleteByHouseholdId(Long householdId);
}
