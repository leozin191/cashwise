package com.leozara.cashwise.repository;

import com.leozara.cashwise.model.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    Optional<PasswordResetToken> findByToken(String token);
    void deleteByEmail(String email);

    /**
     * Atomically marks the token as used if (and only if) it is currently unused and not expired.
     * Returns the number of rows updated (1 = success, 0 = already used or expired).
     */
    @Modifying
    @Query("UPDATE PasswordResetToken t SET t.used = true WHERE t.token = :token AND t.used = false AND t.expiresAt > :now")
    int markUsedIfValid(@Param("token") String token, @Param("now") LocalDateTime now);
}
