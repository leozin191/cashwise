package com.leozara.cashwise.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class BudgetAdviceDto {
    private String category;
    private Double currentMonthlySpend;
    private Double suggestedBudget;
    private String reason;
}
