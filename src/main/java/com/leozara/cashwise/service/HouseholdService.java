package com.leozara.cashwise.service;

import com.leozara.cashwise.dto.*;
import com.leozara.cashwise.model.*;
import com.leozara.cashwise.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HouseholdService {

    private final HouseholdRepository householdRepository;
    private final HouseholdMemberRepository memberRepository;
    private final HouseholdInvitationRepository invitationRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    public HouseholdResponse getMyHousehold(Long userId) {
        HouseholdMember member = memberRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalStateException("You are not part of any household"));

        Household household = householdRepository.findById(member.getHouseholdId())
                .orElseThrow(() -> new IllegalStateException("Household not found"));

        List<HouseholdMember> allMembers = memberRepository.findByHouseholdId(household.getId());

        List<MemberDto> memberDtos = allMembers.stream().map(m -> {
            User user = userRepository.findById(m.getUserId()).orElseThrow();
            return new MemberDto(user.getId(), user.getName(), user.getUsername(), m.getRole(), m.getJoinedAt());
        }).collect(Collectors.toList());

        List<PendingInviteDto> pendingInvites = invitationRepository
                .findByHouseholdId(household.getId()).stream()
                .filter(inv -> "PENDING".equals(inv.getStatus()))
                .map(inv -> {
                    User inviter = userRepository.findById(inv.getInvitedBy()).orElseThrow();
                    return new PendingInviteDto(inv.getToken(), household.getName(),
                            inviter.getName(), inv.getExpiresAt());
                })
                .collect(Collectors.toList());

        return new HouseholdResponse(household.getId(), household.getName(),
                member.getRole(), memberDtos, pendingInvites);
    }

    @Transactional
    public Household createHousehold(Long userId, String name) {
        if (memberRepository.existsByUserId(userId)) {
            throw new IllegalArgumentException("You are already a member of a household");
        }
        Household household = new Household(name, userId);
        Household saved = householdRepository.save(household);
        memberRepository.save(new HouseholdMember(saved.getId(), userId, "OWNER"));
        return saved;
    }

    @Transactional
    public void renameHousehold(Long userId, String newName) {
        HouseholdMember member = memberRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalStateException("You are not part of any household"));
        if (!"OWNER".equals(member.getRole())) {
            throw new AccessDeniedException("Only the owner can rename the household");
        }
        Household household = householdRepository.findById(member.getHouseholdId())
                .orElseThrow(() -> new IllegalStateException("Household not found"));
        household.setName(newName);
        householdRepository.save(household);
    }

    @Transactional
    public void inviteMember(Long userId, InviteMemberRequest req) {
        HouseholdMember ownerMember = memberRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalStateException("You are not part of any household"));
        if (!"OWNER".equals(ownerMember.getRole())) {
            throw new AccessDeniedException("Only the owner can invite members");
        }

        if (!StringUtils.hasText(req.getEmail()) && !StringUtils.hasText(req.getUsername())) {
            throw new IllegalArgumentException("Either email or username is required");
        }

        String targetEmail;
        if (StringUtils.hasText(req.getEmail())) {
            targetEmail = req.getEmail().trim().toLowerCase();
        } else {
            User target = userRepository.findByUsername(req.getUsername().trim())
                    .orElseThrow(() -> new IllegalArgumentException("User @" + req.getUsername() + " not found"));
            targetEmail = target.getEmail();
        }

        // Check if user is already a member
        userRepository.findByEmail(targetEmail).ifPresent(target -> {
            if (memberRepository.existsByUserId(target.getId())) {
                throw new IllegalArgumentException("This user is already in a household");
            }
        });

        Household household = householdRepository.findById(ownerMember.getHouseholdId())
                .orElseThrow(() -> new IllegalStateException("Household not found"));
        User inviter = userRepository.findById(userId).orElseThrow();

        String token = UUID.randomUUID().toString();
        HouseholdInvitation invitation = new HouseholdInvitation(
                household.getId(), userId, targetEmail, token,
                LocalDateTime.now().plusDays(7)
        );
        invitationRepository.save(invitation);
        emailService.sendHouseholdInvitationEmail(targetEmail, inviter.getName(), household.getName());
    }

    public List<PendingInviteDto> getPendingInvitations(String email) {
        return invitationRepository.findByEmailAndStatus(email, "PENDING").stream()
                .filter(inv -> inv.getExpiresAt().isAfter(LocalDateTime.now()))
                .map(inv -> {
                    Household household = householdRepository.findById(inv.getHouseholdId()).orElseThrow();
                    User inviter = userRepository.findById(inv.getInvitedBy()).orElseThrow();
                    return new PendingInviteDto(inv.getToken(), household.getName(),
                            inviter.getName(), inv.getExpiresAt());
                })
                .collect(Collectors.toList());
    }

    public List<PendingInviteDto> getPendingInvitationsForUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return getPendingInvitations(user.getEmail());
    }

    @Transactional
    public void acceptInvitation(Long userId, String token) {
        HouseholdInvitation invitation = invitationRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid invitation token"));

        if (!"PENDING".equals(invitation.getStatus())) {
            throw new IllegalArgumentException("Invitation is no longer pending");
        }
        if (invitation.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Invitation has expired");
        }
        if (memberRepository.existsByUserId(userId)) {
            throw new IllegalArgumentException("You are already a member of a household");
        }

        invitation.setStatus("ACCEPTED");
        invitationRepository.save(invitation);

        memberRepository.save(new HouseholdMember(invitation.getHouseholdId(), userId, "MEMBER"));
    }

    @Transactional
    public void declineInvitation(Long userId, String token) {
        HouseholdInvitation invitation = invitationRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid invitation token"));

        if (!"PENDING".equals(invitation.getStatus())) {
            throw new IllegalArgumentException("Invitation is no longer pending");
        }

        invitation.setStatus("DECLINED");
        invitationRepository.save(invitation);
    }

    @Transactional
    public void removeMember(Long ownerId, Long targetUserId) {
        HouseholdMember ownerMember = memberRepository.findByUserId(ownerId)
                .orElseThrow(() -> new IllegalStateException("You are not part of any household"));
        if (!"OWNER".equals(ownerMember.getRole())) {
            throw new AccessDeniedException("Only the owner can remove members");
        }
        if (ownerId.equals(targetUserId)) {
            throw new IllegalArgumentException("Owner cannot remove themselves. Use leave household instead.");
        }

        HouseholdMember targetMember = memberRepository
                .findByHouseholdIdAndUserId(ownerMember.getHouseholdId(), targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("Member not found in household"));

        memberRepository.delete(targetMember);
    }

    @Transactional
    public void leaveHousehold(Long userId) {
        HouseholdMember member = memberRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalStateException("You are not part of any household"));
        if ("OWNER".equals(member.getRole())) {
            throw new IllegalArgumentException("The owner cannot leave. Delete the household or transfer ownership.");
        }
        memberRepository.delete(member);
    }

    /**
     * Called from AuthService after a legacy user sets their username for the first time.
     * Runs in its own transaction (REQUIRES_NEW) so a failure here never rolls back
     * the caller's transaction (e.g. the username save in setUsername).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void ensurePersonalHousehold(Long userId, String userName) {
        if (memberRepository.existsByUserId(userId)) {
            return; // already has a household
        }
        Household household = new Household(userName + "'s Household", userId);
        Household saved = householdRepository.save(household);
        memberRepository.save(new HouseholdMember(saved.getId(), userId, "OWNER"));
    }

    /**
     * Called from AuthService before deleting a user account.
     * OWNER: deletes the household (cascades to members & invitations; SET NULL on data).
     * MEMBER: nothing — the FK CASCADE on user_id handles membership removal on user deletion.
     */
    @Transactional
    public void handleAccountDeletion(Long userId) {
        memberRepository.findByUserId(userId).ifPresent(member -> {
            if ("OWNER".equals(member.getRole())) {
                householdRepository.deleteById(member.getHouseholdId());
            }
        });
    }
}
