package com.leozara.cashwise.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class RecurringSuggestionDto {
    private String description;
    private BigDecimal amount;
    private String currency;
    private String category;
    private String frequency;
    private Integer dayOfMonth;
    private Integer occurrences;
}
