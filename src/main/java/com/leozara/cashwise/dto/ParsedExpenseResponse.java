package com.leozara.cashwise.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ParsedExpenseResponse {
    private String description;
    private Double amount;
    private String date;
    private String category;
    private String currency;
}
