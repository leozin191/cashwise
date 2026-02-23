package com.leozara.cashwise.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ScanReceiptRequest {

    @NotBlank
    @Size(max = 2_000_000)
    private String imageBase64;

    @Pattern(regexp = "^image/(jpeg|png|webp|gif)$", message = "Unsupported image type")
    private String mimeType = "image/jpeg";
}
