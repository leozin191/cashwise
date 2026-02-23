package com.leozara.cashwise.controller;

import com.leozara.cashwise.dto.*;
import com.leozara.cashwise.service.AuthService;
import java.util.Map;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/profile")
    public ResponseEntity<ProfileResponse> getProfile(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(authService.getProfile(userId));
    }

    @PutMapping("/profile")
    public ResponseEntity<ProfileResponse> updateProfile(Authentication authentication,
                                                          @Valid @RequestBody UpdateProfileRequest request) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(authService.updateProfile(userId, request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refreshToken(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(authService.refreshToken(userId));
    }

    @PutMapping("/password")
    public ResponseEntity<Void> changePassword(Authentication authentication,
                                                @Valid @RequestBody ChangePasswordRequest request) {
        Long userId = (Long) authentication.getPrincipal();
        authService.changePassword(userId, request);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/account")
    public ResponseEntity<Void> deleteAccount(Authentication authentication,
                                               @Valid @RequestBody DeleteAccountRequest request) {
        Long userId = (Long) authentication.getPrincipal();
        authService.deleteAccount(userId, request.getPassword());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/check-username/{username}")
    public ResponseEntity<Map<String, Boolean>> checkUsername(@PathVariable String username) {
        return ResponseEntity.ok(Map.of("available", authService.isUsernameAvailable(username)));
    }

    @PutMapping("/username")
    public ResponseEntity<AuthResponse> setUsername(Authentication authentication,
                                                     @Valid @RequestBody SetUsernameRequest request) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(authService.setUsername(userId, request.getUsername()));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok().build();
    }
}
