package com.leozara.cashwise.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class InsightDto {
    private String type;   // anomaly | tip | trend
    private String title;
    private String message;
    private String icon;   // warning-outline | bulb-outline | trending-up-outline
}
