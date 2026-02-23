package com.leozara.cashwise.controller;

import com.leozara.cashwise.dto.ExpenseResponse;
import com.leozara.cashwise.dto.SubscriptionCreateRequest;
import com.leozara.cashwise.dto.SubscriptionResponse;
import com.leozara.cashwise.dto.SubscriptionUpdateRequest;
import com.leozara.cashwise.security.AuthUtil;
import com.leozara.cashwise.service.SubscriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    @GetMapping
    public ResponseEntity<?> getAll(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        Long userId = AuthUtil.getCurrentUserId();
        if (page != null && size != null) {
            var pageable = PageRequest.of(page, Math.min(size, 200), Sort.by("description").ascending());
            return ResponseEntity.ok(subscriptionService.getAllSubscriptions(userId, pageable));
        }
        return ResponseEntity.ok(subscriptionService.getAllSubscriptions(userId));
    }

    @GetMapping("/active")
    public ResponseEntity<List<SubscriptionResponse>> getActive() {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(subscriptionService.getActiveSubscriptions(userId));
    }

    @PostMapping
    public ResponseEntity<SubscriptionResponse> create(@Valid @RequestBody SubscriptionCreateRequest subscription) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(subscriptionService.createSubscription(subscription, userId));
    }

    @PostMapping("/bulk")
    public ResponseEntity<List<SubscriptionResponse>> createMultiple(
            @RequestBody List<@Valid SubscriptionCreateRequest> subscriptions) {
        if (subscriptions == null || subscriptions.isEmpty()) {
            throw new IllegalArgumentException("Subscription list cannot be null or empty.");
        }
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(subscriptionService.createSubscriptions(subscriptions, userId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SubscriptionResponse> update(@PathVariable Long id,
                                                       @Valid @RequestBody SubscriptionUpdateRequest details) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(subscriptionService.updateSubscription(id, details, userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long userId = AuthUtil.getCurrentUserId();
        subscriptionService.deleteSubscription(id, userId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<SubscriptionResponse> toggle(@PathVariable Long id) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(subscriptionService.toggleActive(id, userId));
    }

    @PostMapping("/process")
    public ResponseEntity<List<ExpenseResponse>> processNow() {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(subscriptionService.processSubscriptions(userId));
    }
}
