package com.leozara.cashwise.controller;

import com.leozara.cashwise.model.Expense;
import com.leozara.cashwise.model.Subscription;
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
    public ResponseEntity<List<Subscription>> getActive() {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(subscriptionService.getActiveSubscriptions(userId));
    }

    @PostMapping
    public ResponseEntity<Subscription> create(@Valid @RequestBody Subscription subscription) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(subscriptionService.createSubscription(subscription, userId));
    }

    @PostMapping("/bulk")
    public ResponseEntity<List<Subscription>> createMultiple(@Valid @RequestBody List<Subscription> subscriptions) {
        if (subscriptions == null || subscriptions.isEmpty()) {
            throw new IllegalArgumentException("Subscription list cannot be null or empty.");
        }
        Long userId = AuthUtil.getCurrentUserId();
        List<Subscription> savedSubscriptions = subscriptions.stream()
                .map(sub -> subscriptionService.createSubscription(sub, userId))
                .toList();
        return ResponseEntity.status(HttpStatus.CREATED).body(savedSubscriptions);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Subscription> update(@PathVariable Long id,
                                               @Valid @RequestBody Subscription details) {
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
    public ResponseEntity<Subscription> toggle(@PathVariable Long id) {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(subscriptionService.toggleActive(id, userId));
    }

    @PostMapping("/process")
    public ResponseEntity<List<Expense>> processNow() {
        Long userId = AuthUtil.getCurrentUserId();
        return ResponseEntity.ok(subscriptionService.processSubscriptions(userId));
    }
}
