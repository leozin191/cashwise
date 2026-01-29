package com.leozara.cashwise.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CategorySuggestionResponse {
    private String description;
    private String suggestedCategory;
}