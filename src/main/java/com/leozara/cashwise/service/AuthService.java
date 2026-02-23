package com.leozara.cashwise.service;

import com.leozara.cashwise.dto.*;
import com.leozara.cashwise.model.PasswordResetToken;
import com.leozara.cashwise.model.User;
import com.leozara.cashwise.repository.ExpenseRepository;
import com.leozara.cashwise.repository.IncomeRepository;
import com.leozara.cashwise.repository.PasswordResetTokenRepository;
import com.leozara.cashwise.repository.SubscriptionRepository;
import com.leozara.cashwise.repository.UserRepository;
import com.leozara.cashwise.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final ExpenseRepository expenseRepository;
    private final IncomeRepository incomeRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final HouseholdService householdService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered");
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already taken");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setName(request.getName());
        user.setUsername(request.getUsername());

        User saved = userRepository.save(user);

        householdService.createHousehold(saved.getId(), saved.getName() + "'s Household");

        String token = jwtService.generateToken(saved.getId(), saved.getEmail());
        return new AuthResponse(token, saved.getEmail(), saved.getName(), saved.getUsername());
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        String token = jwtService.generateToken(user.getId(), user.getEmail());
        return new AuthResponse(token, user.getEmail(), user.getName(), user.getUsername());
    }

    public ProfileResponse getProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return new ProfileResponse(user.getName(), user.getEmail(), user.getCreatedAt());
    }

    public ProfileResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setName(request.getName());
        User saved = userRepository.save(user);
        return new ProfileResponse(saved.getName(), saved.getEmail(), saved.getCreatedAt());
    }

    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    public AuthResponse refreshToken(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        String newToken = jwtService.generateToken(user.getId(), user.getEmail());
        return new AuthResponse(newToken, user.getEmail(), user.getName(), user.getUsername());
    }

    @Transactional
    public void deleteAccount(Long userId, String password) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new IllegalArgumentException("Incorrect password");
        }

        householdService.handleAccountDeletion(userId);
        expenseRepository.deleteByUserId(userId);
        incomeRepository.deleteByUserId(userId);
        subscriptionRepository.deleteByUserId(userId);
        userRepository.deleteById(userId);
    }

    @Transactional
    public AuthResponse setUsername(Long userId, String username) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Idempotent: if they already have this exact username, just return a fresh token.
        // This handles the case where the client lost the updated token after a previous
        // successful call (e.g. crash/network failure before the response was stored).
        if (username.equals(user.getUsername())) {
            try {
                householdService.ensurePersonalHousehold(userId, user.getName());
            } catch (Exception e) {
                log.warn("Could not ensure personal household for user {}: {}", userId, e.getMessage());
            }
            String token = jwtService.generateToken(user.getId(), user.getEmail());
            return new AuthResponse(token, user.getEmail(), user.getName(), user.getUsername());
        }

        if (user.getUsername() != null) {
            throw new IllegalArgumentException("Username already set");
        }
        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("Username already taken");
        }

        user.setUsername(username);
        userRepository.save(user);
        try {
            householdService.ensurePersonalHousehold(userId, user.getName());
        } catch (Exception e) {
            log.warn("Could not create personal household for user {}: {}", userId, e.getMessage());
        }
        String token = jwtService.generateToken(user.getId(), user.getEmail());
        return new AuthResponse(token, user.getEmail(), user.getName(), username);
    }

    public boolean isUsernameAvailable(String username) {
        return !userRepository.existsByUsername(username);
    }

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        // Always return success to prevent user enumeration
        userRepository.findByEmail(request.getEmail()).ifPresent(user -> {
            passwordResetTokenRepository.deleteByEmail(user.getEmail());

            String token = UUID.randomUUID().toString();
            PasswordResetToken resetToken = new PasswordResetToken(
                    token, user.getEmail(), LocalDateTime.now().plusMinutes(30)
            );
            passwordResetTokenRepository.save(resetToken);
            emailService.sendPasswordResetEmail(user.getEmail(), token);
        });
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        // Atomically mark the token as used — prevents race conditions and replay attacks.
        // Returns 0 if token is already used, expired, or not found.
        int updated = passwordResetTokenRepository.markUsedIfValid(request.getToken(), LocalDateTime.now());
        if (updated == 0) {
            throw new IllegalArgumentException("Invalid or expired reset token");
        }

        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(request.getToken())
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired reset token"));

        User user = userRepository.findByEmail(resetToken.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }
}
