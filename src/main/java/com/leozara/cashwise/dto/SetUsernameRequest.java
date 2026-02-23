package com.leozara.cashwise.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SetUsernameRequest {

    @NotBlank
    @Size(min = 3, max = 30)
    @Pattern(regexp = "^[a-z0-9_]+$", message = "Username must be lowercase alphanumeric and underscores only")
    private String username;
}
