package com.leozara.cashwise.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ParseExpenseRequest {

    @NotBlank
    @Size(max = 500)
    private String text;
}
