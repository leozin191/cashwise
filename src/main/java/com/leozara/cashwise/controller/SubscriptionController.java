package com.leozara.cashwise.controller;

import com.leozara.cashwise.model.Expense;
import com.leozara.cashwise.model.Subscription;
import com.leozara.cashwise.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/subscriptions")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    @GetMapping
    public ResponseEntity<List<Subscription>> getAll() {
        return ResponseEntity.ok(subscriptionService.getAllSubscriptions());
    }

    @GetMapping("/active")
    public ResponseEntity<List<Subscription>> getActive() {
        return ResponseEntity.ok(subscriptionService.getActiveSubscriptions());
    }

    @PostMapping
    public ResponseEntity<Subscription> create(@RequestBody Subscription subscription) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(subscriptionService.createSubscription(subscription));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Subscription> update(@PathVariable Long id,
                                               @RequestBody Subscription details) {
        return ResponseEntity.ok(subscriptionService.updateSubscription(id, details));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        subscriptionService.deleteSubscription(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<Subscription> toggle(@PathVariable Long id) {
        return ResponseEntity.ok(subscriptionService.toggleActive(id));
    }

    // Endpoint manual para processar (útil para testar)
    @PostMapping("/process")
    public ResponseEntity<List<Expense>> processNow() {
        return ResponseEntity.ok(subscriptionService.processSubscriptions());
    }
}