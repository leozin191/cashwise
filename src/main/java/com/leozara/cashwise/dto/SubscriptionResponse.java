package com.leozara.cashwise.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class SubscriptionResponse {

    private Long id;
    private String description;
    private BigDecimal amount;
    private String currency;
    private String category;
    private String frequency;
    private Integer dayOfMonth;
    private Boolean active;
    private LocalDate nextDueDate;
    private Long userId;
    private Long householdId;
    private LocalDateTime createdAt;
    private String addedByName;
    private String addedByUsername;
}
