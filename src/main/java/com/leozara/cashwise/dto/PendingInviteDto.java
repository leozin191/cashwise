package com.leozara.cashwise.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class PendingInviteDto {

    private String token;
    private String householdName;
    private String inviterName;
    private LocalDateTime expiresAt;
}
