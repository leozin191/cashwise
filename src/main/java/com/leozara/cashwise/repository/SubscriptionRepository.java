package com.leozara.cashwise.repository;

import com.leozara.cashwise.model.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {

    List<Subscription> findByActiveTrue();

    List<Subscription> findByActiveTrueAndNextDueDateLessThanEqual(LocalDate date);
}