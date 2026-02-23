package com.leozara.cashwise.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class ChatRequest {

    @NotBlank
    @Size(max = 1000)
    private String question;

    private Map<String, Double> exchangeRates;

    @Size(max = 5)
    private String userCurrency;

    /** Previous conversation turns: [{role:"user"|"assistant", content:"..."}] */
    @Size(max = 20)
    private List<Map<String, String>> history;
}
