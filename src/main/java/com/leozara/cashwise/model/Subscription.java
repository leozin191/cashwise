package com.leozara.cashwise.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
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

    @NotBlank
    @Size(max = 255)
    @Column(nullable = false)
    private String description;

    @NotNull
    @DecimalMin("0.01")
    @Digits(integer = 10, fraction = 2)
    @Column(nullable = false)
    private BigDecimal amount;

    @NotBlank
    @Size(min = 3, max = 3)
    @Column(nullable = false, length = 3)
    private String currency;

    @NotBlank
    @Size(max = 50)
    @Column(nullable = false)
    private String category;

    @NotBlank
    @Pattern(regexp = "MONTHLY|WEEKLY|YEARLY")
    @Column(nullable = false)
    private String frequency;

    @NotNull
    @Min(1)
    @Max(31)
    @Column(nullable = false)
    private Integer dayOfMonth;

    @Column(nullable = false)
    private Boolean active = true;

    @Column(nullable = false)
    private LocalDate nextDueDate;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
