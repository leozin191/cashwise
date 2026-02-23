package com.leozara.cashwise.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "household_invitations")
@Data
@NoArgsConstructor
public class HouseholdInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "household_id", nullable = false)
    private Long householdId;

    @Column(name = "invited_by", nullable = false)
    private Long invitedBy;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false, unique = true)
    private String token;

    @Column(nullable = false, length = 20)
    private String status; // PENDING | ACCEPTED | DECLINED

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public HouseholdInvitation(Long householdId, Long invitedBy, String email,
                                String token, LocalDateTime expiresAt) {
        this.householdId = householdId;
        this.invitedBy = invitedBy;
        this.email = email;
        this.token = token;
        this.status = "PENDING";
        this.expiresAt = expiresAt;
    }
}
