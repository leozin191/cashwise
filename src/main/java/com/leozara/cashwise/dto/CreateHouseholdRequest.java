package com.leozara.cashwise.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateHouseholdRequest {

    @NotBlank
    @Size(max = 100)
    private String name;
}
