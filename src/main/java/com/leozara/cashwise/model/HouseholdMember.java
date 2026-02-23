package com.leozara.cashwise.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "household_members")
@Data
@NoArgsConstructor
public class HouseholdMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "household_id", nullable = false)
    private Long householdId;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(nullable = false, length = 20)
    private String role; // OWNER | MEMBER

    @Column(name = "joined_at", updatable = false)
    private LocalDateTime joinedAt;

    @PrePersist
    protected void onCreate() {
        joinedAt = LocalDateTime.now();
    }

    public HouseholdMember(Long householdId, Long userId, String role) {
        this.householdId = householdId;
        this.userId = userId;
        this.role = role;
    }
}
