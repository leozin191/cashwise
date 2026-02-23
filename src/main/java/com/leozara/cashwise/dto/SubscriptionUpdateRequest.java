package com.leozara.cashwise.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class SubscriptionUpdateRequest {

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

    @NotBlank
    @Size(max = 50)
    private String category;

    @NotBlank
    @Pattern(regexp = "MONTHLY|YEARLY")
    private String frequency;

    @NotNull
    @Min(1)
    @Max(31)
    private Integer dayOfMonth;

    private Boolean active;
}
