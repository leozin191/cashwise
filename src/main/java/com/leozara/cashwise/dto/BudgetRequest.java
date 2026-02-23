package com.leozara.cashwise.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class BudgetRequest {

    @NotBlank
    private String category;

    @NotNull
    @DecimalMin(value = "0.01")
    private BigDecimal monthlyLimit;

    @NotBlank
    private String currency;
}
