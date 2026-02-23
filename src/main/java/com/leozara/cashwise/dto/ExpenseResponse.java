package com.leozara.cashwise.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class ExpenseResponse {

    private Long id;
    private String description;
    private BigDecimal amount;
    private String currency;
    private LocalDate date;
    private String category;
    private String groupId;
    private Long userId;
    private Long householdId;
    private LocalDateTime createdAt;
    private String addedByName;
    private String addedByUsername;
}
