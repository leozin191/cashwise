package com.leozara.cashwise.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class ProfileResponse {

    private String name;
    private String email;
    private LocalDateTime createdAt;
}
