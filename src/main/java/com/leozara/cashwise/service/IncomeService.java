package com.leozara.cashwise.service;

import com.leozara.cashwise.dto.IncomeCreateRequest;
import com.leozara.cashwise.dto.IncomeResponse;
import com.leozara.cashwise.dto.IncomeUpdateRequest;
import com.leozara.cashwise.exception.ResourceNotFoundException;
import com.leozara.cashwise.model.HouseholdMember;
import com.leozara.cashwise.model.Income;
import com.leozara.cashwise.repository.HouseholdMemberRepository;
import com.leozara.cashwise.repository.IncomeRepository;
import com.leozara.cashwise.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class IncomeService {

    private final IncomeRepository incomeRepository;
    private final HouseholdMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final AiService aiService;

    private Long getHouseholdId(Long userId) {
        return memberRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalStateException("You are not part of any household"))
                .getHouseholdId();
    }

    private IncomeResponse toResponse(Income income) {
        IncomeResponse resp = new IncomeResponse();
        resp.setId(income.getId());
        resp.setDescription(income.getDescription());
        resp.setAmount(income.getAmount());
        resp.setCurrency(income.getCurrency());
        resp.setDate(income.getDate());
        resp.setCategory(income.getCategory());
        resp.setUserId(income.getUserId());
        resp.setHouseholdId(income.getHouseholdId());
        resp.setCreatedAt(income.getCreatedAt());
        userRepository.findById(income.getUserId()).ifPresent(u -> {
            resp.setAddedByName(u.getName());
            resp.setAddedByUsername(u.getUsername());
        });
        return resp;
    }

    private void checkCanEdit(Long currentUserId, Income income) {
        HouseholdMember member = memberRepository.findByUserId(currentUserId)
                .orElseThrow(() -> new AccessDeniedException("Not a household member"));
        if (!"OWNER".equals(member.getRole()) && !currentUserId.equals(income.getUserId())) {
            throw new AccessDeniedException("You can only modify your own entries");
        }
    }

    @Transactional
    public IncomeResponse createIncome(IncomeCreateRequest request, Long userId) {
        IncomeResponse response = toResponse(incomeRepository.save(buildNewIncome(request, userId)));
        aiService.invalidateInsightsCache(userId);
        return response;
    }

    @Transactional
    public List<IncomeResponse> createIncomes(List<IncomeCreateRequest> requests, Long userId) {
        List<IncomeResponse> results = new ArrayList<>(requests.size());
        for (IncomeCreateRequest request : requests) {
            results.add(toResponse(incomeRepository.save(buildNewIncome(request, userId))));
        }
        aiService.invalidateInsightsCache(userId);
        return results;
    }

    private Income buildNewIncome(IncomeCreateRequest request, Long userId) {
        Long householdId = getHouseholdId(userId);
        Income income = new Income();
        income.setDescription(request.getDescription());
        income.setAmount(request.getAmount());
        income.setCurrency(request.getCurrency());
        income.setDate(request.getDate());
        income.setCategory(request.getCategory());
        income.setUserId(userId);
        income.setHouseholdId(householdId);
        return income;
    }

    public List<IncomeResponse> getAllIncomes(Long userId) {
        Long householdId = getHouseholdId(userId);
        return incomeRepository.findByHouseholdId(householdId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    public Page<IncomeResponse> getAllIncomes(Long userId, Pageable pageable) {
        Long householdId = getHouseholdId(userId);
        Page<Income> page = incomeRepository.findByHouseholdId(householdId, pageable);
        List<IncomeResponse> content = page.getContent().stream()
                .map(this::toResponse).collect(Collectors.toList());
        return new PageImpl<>(content, pageable, page.getTotalElements());
    }

    public IncomeResponse getIncomeById(Long id, Long userId) {
        Long householdId = getHouseholdId(userId);
        Income income = incomeRepository.findByIdAndHouseholdId(id, householdId)
                .orElseThrow(() -> new ResourceNotFoundException("Income not found with ID: " + id));
        return toResponse(income);
    }

    @Transactional
    public IncomeResponse updateIncome(Long id, IncomeUpdateRequest incomeDetails, Long userId) {
        Long householdId = getHouseholdId(userId);
        Income income = incomeRepository.findByIdAndHouseholdId(id, householdId)
                .orElseThrow(() -> new ResourceNotFoundException("Income not found with ID: " + id));
        checkCanEdit(userId, income);

        income.setDescription(incomeDetails.getDescription());
        income.setAmount(incomeDetails.getAmount());
        income.setCurrency(incomeDetails.getCurrency());
        income.setDate(incomeDetails.getDate());
        income.setCategory(incomeDetails.getCategory());

        IncomeResponse response = toResponse(incomeRepository.save(income));
        aiService.invalidateInsightsCache(userId);
        return response;
    }

    @Transactional
    public void deleteIncome(Long id, Long userId) {
        Long householdId = getHouseholdId(userId);
        Income income = incomeRepository.findByIdAndHouseholdId(id, householdId)
                .orElseThrow(() -> new ResourceNotFoundException("Income not found with ID: " + id));
        checkCanEdit(userId, income);
        incomeRepository.delete(income);
        aiService.invalidateInsightsCache(userId);
    }

    public List<IncomeResponse> getIncomesByDateRange(LocalDate startDate, LocalDate endDate, Long userId) {
        Long householdId = getHouseholdId(userId);
        return incomeRepository.findByDateBetweenAndHouseholdId(startDate, endDate, householdId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    public List<IncomeResponse> getIncomesByCurrency(String currency, Long userId) {
        Long householdId = getHouseholdId(userId);
        return incomeRepository.findByCurrencyAndHouseholdId(currency, householdId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    public List<IncomeResponse> getIncomesByDate(LocalDate date, Long userId) {
        Long householdId = getHouseholdId(userId);
        return incomeRepository.findByDateAndHouseholdId(date, householdId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }
}
