package com.leozara.cashwise.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "subscriptions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Subscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String description; // "Netflix", "Spotify", "Gym"

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency; // EUR, USD, BRL

    @Column(nullable = false)
    private String category; // Entertainment, Health, etc

    @Column(nullable = false)
    private String frequency; // MONTHLY, WEEKLY, YEARLY

    @Column(nullable = false)
    private Integer dayOfMonth; // Dia do mês para cobrar (1-28)

    @Column(nullable = false)
    private Boolean active = true; // Pode pausar sem deletar

    @Column(nullable = false)
    private LocalDate nextDueDate; // Próxima data de cobrança

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}