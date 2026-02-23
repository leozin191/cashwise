package com.leozara.cashwise.dto;

import lombok.Data;
import java.util.Map;

@Data
public class CurrencyContextRequest {
    private Map<String, Double> exchangeRates;
    private String userCurrency;
}
