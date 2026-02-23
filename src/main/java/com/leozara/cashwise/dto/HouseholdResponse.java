package com.leozara.cashwise.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class HouseholdResponse {

    private Long id;
    private String name;
    private String myRole;
    private List<MemberDto> members;
    private List<PendingInviteDto> pendingInvites;
}
