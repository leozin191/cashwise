package com.leozara.cashwise.controller;

import com.leozara.cashwise.dto.*;
import com.leozara.cashwise.service.AiService;
import com.leozara.cashwise.service.ExpenseService;
import com.leozara.cashwise.service.IncomeService;
import com.leozara.cashwise.service.SubscriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;
    private final ExpenseService expenseService;
    private final IncomeService incomeService;
    private final SubscriptionService subscriptionService;

    // ── Parse expense ──────────────────────────────────────────────────────────

    @PostMapping("/parse-expense")
    public ResponseEntity<ParsedExpenseResponse> parseExpense(
            @Valid @RequestBody ParseExpenseRequest request) {
        ParsedExpenseResponse result = aiService.parseExpense(request.getText(), LocalDate.now());
        return ResponseEntity.ok(result);
    }

    // ── Parse income ───────────────────────────────────────────────────────────

    @PostMapping("/parse-income")
    public ResponseEntity<ParsedExpenseResponse> parseIncome(
            @Valid @RequestBody ParseExpenseRequest request) {
        ParsedExpenseResponse result = aiService.parseIncome(request.getText(), LocalDate.now());
        return ResponseEntity.ok(result);
    }

    // ── Chat ───────────────────────────────────────────────────────────────────

    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(
            Authentication authentication,
            @Valid @RequestBody ChatRequest request) {
        Long userId = (Long) authentication.getPrincipal();
        String context = buildSpendingContext(userId, request.getExchangeRates(), request.getUserCurrency());
        String answer = aiService.chat(request.getQuestion(), context, request.getHistory());
        return ResponseEntity.ok(new ChatResponse(answer));
    }

    // ── Scan receipt ───────────────────────────────────────────────────────────

    @PostMapping("/scan-receipt")
    public ResponseEntity<ParsedExpenseResponse> scanReceipt(
            @Valid @RequestBody ScanReceiptRequest request) {
        String mimeType = request.getMimeType() != null ? request.getMimeType() : "image/jpeg";
        ParsedExpenseResponse result = aiService.scanReceipt(
                request.getImageBase64(), mimeType, LocalDate.now());
        return ResponseEntity.ok(result);
    }

    // ── Insights (cached per user, 6h TTL) ────────────────────────────────────

    @PostMapping("/insights")
    public ResponseEntity<List<InsightDto>> getInsights(
            Authentication authentication,
            @RequestBody(required = false) CurrencyContextRequest request) {
        Long userId = (Long) authentication.getPrincipal();
        Map<String, Double> rates = request != null ? request.getExchangeRates() : null;
        String currency = request != null ? request.getUserCurrency() : null;
        String context = buildSpendingContext(userId, rates, currency);
        List<InsightDto> insights = aiService.getInsights(context, userId);
        return ResponseEntity.ok(insights);
    }

    // ── Budget advisor ─────────────────────────────────────────────────────────

    @PostMapping("/budget-advice")
    public ResponseEntity<List<BudgetAdviceDto>> budgetAdvice(
            Authentication authentication,
            @RequestBody(required = false) CurrencyContextRequest request) {
        Long userId = (Long) authentication.getPrincipal();
        Map<String, Double> rates = request != null ? request.getExchangeRates() : null;
        String currency = request != null ? request.getUserCurrency() : null;
        String context = buildSpendingContext(userId, rates, currency);
        List<BudgetAdviceDto> advice = aiService.budgetAdvice(context);
        return ResponseEntity.ok(advice);
    }

    // ── Recurring expense detector ─────────────────────────────────────────────

    @GetMapping("/detect-recurring")
    public ResponseEntity<List<RecurringSuggestionDto>> detectRecurring(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();

        LocalDate sixMonthsAgo = LocalDate.now().minusMonths(6);
        List<ExpenseResponse> expenses = expenseService.getExpensesByDateRange(sixMonthsAgo, LocalDate.now(), userId);
        List<SubscriptionResponse> existing = subscriptionService.getAllSubscriptions(userId);

        Set<String> existingDescs = existing.stream()
                .map(s -> s.getDescription().toLowerCase().trim())
                .collect(Collectors.toSet());

        // Group by normalized description
        Map<String, List<ExpenseResponse>> grouped = expenses.stream()
                .filter(e -> e.getDescription() != null)
                .collect(Collectors.groupingBy(e -> e.getDescription().toLowerCase().trim()));

        List<RecurringSuggestionDto> suggestions = new ArrayList<>();

        for (Map.Entry<String, List<ExpenseResponse>> entry : grouped.entrySet()) {
            String key = entry.getKey();
            List<ExpenseResponse> group = entry.getValue();

            if (existingDescs.contains(key)) continue;
            if (group.size() < 2) continue;

            // Must appear in at least 2 distinct calendar months
            long distinctMonths = group.stream()
                    .map(e -> e.getDate().getYear() * 100L + e.getDate().getMonthValue())
                    .distinct()
                    .count();
            if (distinctMonths < 2) continue;

            // Amounts must be similar (within 25% of median)
            List<Double> amounts = group.stream()
                    .map(e -> e.getAmount().doubleValue())
                    .sorted()
                    .collect(Collectors.toList());
            double median = amounts.get(amounts.size() / 2);
            if (median <= 0) continue;
            boolean similar = amounts.stream().allMatch(a -> Math.abs(a - median) / median <= 0.25);
            if (!similar) continue;

            // Use the most recent expense as representative
            ExpenseResponse rep = group.stream()
                    .max(Comparator.comparing(ExpenseResponse::getDate))
                    .orElse(group.get(0));

            RecurringSuggestionDto dto = new RecurringSuggestionDto();
            dto.setDescription(rep.getDescription());
            dto.setAmount(BigDecimal.valueOf(median).setScale(2, RoundingMode.HALF_UP));
            dto.setCurrency(rep.getCurrency());
            dto.setCategory(rep.getCategory());
            dto.setFrequency("MONTHLY");
            dto.setDayOfMonth(rep.getDate().getDayOfMonth());
            dto.setOccurrences(group.size());

            suggestions.add(dto);
        }

        // Sort by occurrences descending, limit to 10
        suggestions.sort(Comparator.comparing(RecurringSuggestionDto::getOccurrences).reversed());
        return ResponseEntity.ok(suggestions.stream().limit(10).collect(Collectors.toList()));
    }

    // ── Context builder ────────────────────────────────────────────────────────

    private String buildSpendingContext(Long userId, Map<String, Double> exchangeRates, String userCurrency) {
        LocalDate threeMonthsAgo = LocalDate.now().minusMonths(3);
        List<ExpenseResponse> expenses = expenseService.getExpensesByDateRange(threeMonthsAgo, LocalDate.now(), userId);
        List<IncomeResponse> incomes = incomeService.getIncomesByDateRange(threeMonthsAgo, LocalDate.now(), userId);
        List<SubscriptionResponse> subscriptions = subscriptionService.getActiveSubscriptions(userId);

        // Determine display currency and EUR→display conversion rate
        final String displayCurrency = (userCurrency != null && !userCurrency.isBlank())
                ? userCurrency.toUpperCase() : "EUR";
        final double convRate = (!"EUR".equals(displayCurrency) && exchangeRates != null
                && exchangeRates.containsKey(displayCurrency)
                && isPlausibleRate(exchangeRates.get(displayCurrency)))
                ? exchangeRates.get(displayCurrency)
                : 1.0;

        // Expenses by category (stored in EUR)
        Map<String, Double> byCategory = new TreeMap<>();
        double totalExpenses = 0;
        for (ExpenseResponse e : expenses) {
            String cat = e.getCategory() != null ? e.getCategory() : "General";
            double amt = e.getAmount().doubleValue();
            byCategory.merge(cat, amt, Double::sum);
            totalExpenses += amt;
        }

        double totalIncome = incomes.stream()
                .mapToDouble(i -> i.getAmount().doubleValue())
                .sum();

        // Active subscriptions monthly cost
        double monthlySubscriptionCost = subscriptions.stream()
                .mapToDouble(s -> {
                    double amt = s.getAmount().doubleValue();
                    return "YEARLY".equals(s.getFrequency()) ? amt / 12.0 : amt;
                })
                .sum();

        StringBuilder sb = new StringBuilder();
        sb.append("User's display currency: ").append(displayCurrency).append("\n");
        sb.append("Period: last 3 months\n");
        sb.append(String.format("Total income: %s %.2f\n", displayCurrency, totalIncome * convRate));
        sb.append(String.format("Total expenses: %s %.2f\n", displayCurrency, totalExpenses * convRate));
        sb.append(String.format("Net savings: %s %.2f\n\n", displayCurrency, (totalIncome - totalExpenses) * convRate));
        sb.append("Spending by category:\n");
        byCategory.entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .forEach(entry -> sb.append(String.format(
                        "- %s: %s %.2f (avg %s %.2f/month)\n",
                        entry.getKey(),
                        displayCurrency, entry.getValue() * convRate,
                        displayCurrency, entry.getValue() * convRate / 3)));

        // Current month
        LocalDate monthStart = LocalDate.now().withDayOfMonth(1);
        double currentMonthSpend = expenses.stream()
                .filter(e -> !e.getDate().isBefore(monthStart))
                .mapToDouble(e -> e.getAmount().doubleValue())
                .sum();
        sb.append(String.format("\nCurrent month spending so far: %s %.2f\n",
                displayCurrency, currentMonthSpend * convRate));

        // Subscriptions
        if (!subscriptions.isEmpty()) {
            sb.append(String.format("\nActive subscriptions (%d total, %s %.2f/month):\n",
                    subscriptions.size(), displayCurrency, monthlySubscriptionCost * convRate));
            subscriptions.forEach(s -> sb.append(String.format(
                    "- %s: %s %.2f (%s)\n",
                    s.getDescription(), displayCurrency,
                    s.getAmount().doubleValue() * convRate, s.getFrequency())));
        }

        if (exchangeRates != null && !exchangeRates.isEmpty()) {
            sb.append("\nCurrent exchange rates (1 EUR = ...):\n");
            exchangeRates.entrySet().stream()
                    .filter(e -> isPlausibleRate(e.getValue()))
                    .sorted(Map.Entry.comparingByKey())
                    .forEach(e -> sb.append(String.format("  %s: %.4f\n", e.getKey(), e.getValue())));
            sb.append("Use ONLY these rates for any currency conversions. Do not use your own training data rates.\n");
        }

        sb.append(String.format("\nAlways express amounts in %s in your response.\n", displayCurrency));

        return sb.toString();
    }

    /** Reject exchange rates outside any realistic currency pair range (0.0001 – 100000). */
    private boolean isPlausibleRate(Double rate) {
        return rate != null && rate > 0.0001 && rate < 100_000;
    }
}
