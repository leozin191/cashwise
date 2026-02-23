package com.leozara.cashwise.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class MemberDto {

    private Long userId;
    private String name;
    private String username;
    private String role;
    private LocalDateTime joinedAt;
}
