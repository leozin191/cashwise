package com.leozara.cashwise.repository;

import com.leozara.cashwise.model.Subscription;
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
public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {

    List<Subscription> findByUserId(Long userId);

    Page<Subscription> findByUserId(Long userId, Pageable pageable);

    Optional<Subscription> findByIdAndUserId(Long id, Long userId);

    List<Subscription> findByActiveTrueAndUserId(Long userId);

    List<Subscription> findByActiveTrueAndNextDueDateLessThanEqual(LocalDate date);

    List<Subscription> findByActiveTrueAndNextDueDateLessThanEqualAndUserId(LocalDate date, Long userId);

    @Modifying
    @Query("DELETE FROM Subscription s WHERE s.userId = :userId")
    void deleteByUserId(Long userId);
}
