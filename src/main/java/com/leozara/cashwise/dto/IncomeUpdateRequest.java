package com.leozara.cashwise.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class IncomeUpdateRequest {

    @NotBlank
    @Size(max = 255)
    private String description;

    @NotNull
    @DecimalMin("0.01")
    @Digits(integer = 10, fraction = 2)
    private BigDecimal amount;

    @NotBlank
    @Size(min = 3, max = 3)
    private String currency;

    @NotNull
    private LocalDate date;

    @Size(max = 50)
    private String category;
}
