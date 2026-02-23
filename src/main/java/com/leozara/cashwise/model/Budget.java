package com.leozara.cashwise.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "budgets",
        uniqueConstraints = @UniqueConstraint(columnNames = {"household_id", "category"}))
@Data
@NoArgsConstructor
public class Budget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "household_id", nullable = false)
    private Long householdId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(name = "monthly_limit", nullable = false, precision = 12, scale = 2)
    private BigDecimal monthlyLimit;

    @Column(nullable = false, length = 10)
    private String currency;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Budget(Long householdId, Long userId, String category, BigDecimal monthlyLimit, String currency) {
        this.householdId = householdId;
        this.userId = userId;
        this.category = category;
        this.monthlyLimit = monthlyLimit;
        this.currency = currency;
    }
}
