package com.leozara.cashwise.controller;

import com.leozara.cashwise.dto.*;
import com.leozara.cashwise.security.AuthUtil;
import com.leozara.cashwise.service.HouseholdService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/household")
@RequiredArgsConstructor
public class HouseholdController {

    private final HouseholdService householdService;

    @PostMapping
    public ResponseEntity<Void> createHousehold(@Valid @RequestBody CreateHouseholdRequest request) {
        Long userId = AuthUtil.getCurrentUserId();
        householdService.createHousehold(userId, request.getName());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @GetMapping
    public ResponseEntity<HouseholdResponse> getMyHousehold() {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(householdService.getMyHousehold(userId));
    }

    @PutMapping("/name")
    public ResponseEntity<Void> renameHousehold(@RequestBody CreateHouseholdRequest request) {
        Long userId = AuthUtil.getCurrentUserId();
        householdService.renameHousehold(userId, request.getName());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/invite")
    public ResponseEntity<Void> inviteMember(@RequestBody InviteMemberRequest request) {
        Long userId = AuthUtil.getCurrentUserId();
        householdService.inviteMember(userId, request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/invitations/pending")
    public ResponseEntity<List<PendingInviteDto>> getPendingInvitations() {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(householdService.getPendingInvitationsForUser(userId));
    }

    @PostMapping("/invitations/{token}/accept")
    public ResponseEntity<Void> acceptInvitation(@PathVariable String token) {
        Long userId = AuthUtil.getCurrentUserId();
        householdService.acceptInvitation(userId, token);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/invitations/{token}/decline")
    public ResponseEntity<Void> declineInvitation(@PathVariable String token) {
        Long userId = AuthUtil.getCurrentUserId();
        householdService.declineInvitation(userId, token);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/members/{targetUserId}")
    public ResponseEntity<Void> removeMember(@PathVariable Long targetUserId) {
        Long userId = AuthUtil.getCurrentUserId();
        householdService.removeMember(userId, targetUserId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/leave")
    public ResponseEntity<Void> leaveHousehold() {
        Long userId = AuthUtil.getCurrentUserId();
        householdService.leaveHousehold(userId);
        return ResponseEntity.noContent().build();
    }
}
