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
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
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
        LocalDate today = LocalDate.now();
        LocalDate threeMonthsAgo = today.minusMonths(3);

        List<ExpenseResponse> expenses = expenseService.getExpensesByDateRange(threeMonthsAgo, today, userId);
        List<IncomeResponse> incomes = incomeService.getIncomesByDateRange(threeMonthsAgo, today, userId);
        List<SubscriptionResponse> subscriptions = subscriptionService.getActiveSubscriptions(userId);

        final String displayCurrency = (userCurrency != null && !userCurrency.isBlank())
                ? userCurrency.toUpperCase() : "EUR";
        final double eurToDisplay = (!"EUR".equals(displayCurrency) && exchangeRates != null
                && exchangeRates.containsKey(displayCurrency)
                && isPlausibleRate(exchangeRates.get(displayCurrency)))
                ? exchangeRates.get(displayCurrency)
                : 1.0;

        DateTimeFormatter monthFmt = DateTimeFormatter.ofPattern("yyyy-MM");
        LocalDate monthStart = today.withDayOfMonth(1);
        String currentMonthKey = today.format(monthFmt);

        // ── Aggregate incomes (each converted from its own stored currency) ──
        double totalIncome = 0, currentMonthIncome = 0;
        Map<String, Double> incomeByMonth = new TreeMap<>();
        Map<String, Double> incomeByCategory = new TreeMap<>();
        for (IncomeResponse i : incomes) {
            double amt = toDisplay(i.getAmount().doubleValue(), i.getCurrency(), exchangeRates, displayCurrency, eurToDisplay);
            totalIncome += amt;
            incomeByMonth.merge(i.getDate().format(monthFmt), amt, Double::sum);
            String cat = i.getCategory() != null ? i.getCategory() : "Other";
            incomeByCategory.merge(cat, amt, Double::sum);
            if (!i.getDate().isBefore(monthStart)) currentMonthIncome += amt;
        }

        // ── Aggregate expenses (each converted from its own stored currency) ──
        double totalExpenses = 0, currentMonthExpenses = 0;
        Map<String, Double> expenseByMonth = new TreeMap<>();
        Map<String, Double> expenseByCategory = new TreeMap<>();
        for (ExpenseResponse e : expenses) {
            double amt = toDisplay(e.getAmount().doubleValue(), e.getCurrency(), exchangeRates, displayCurrency, eurToDisplay);
            totalExpenses += amt;
            expenseByMonth.merge(e.getDate().format(monthFmt), amt, Double::sum);
            String cat = e.getCategory() != null ? e.getCategory() : "General";
            expenseByCategory.merge(cat, amt, Double::sum);
            if (!e.getDate().isBefore(monthStart)) currentMonthExpenses += amt;
        }

        // ── Subscriptions monthly cost ──
        double monthlySubscriptionCost = subscriptions.stream().mapToDouble(s -> {
            double amt = toDisplay(s.getAmount().doubleValue(), s.getCurrency(), exchangeRates, displayCurrency, eurToDisplay);
            return "YEARLY".equals(s.getFrequency()) ? amt / 12.0 : amt;
        }).sum();

        Set<String> allMonths = new TreeSet<>();
        allMonths.addAll(incomeByMonth.keySet());
        allMonths.addAll(expenseByMonth.keySet());
        int numMonths = Math.max(allMonths.size(), 1);

        String monthLabel = today.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH) + " " + today.getYear();

        StringBuilder sb = new StringBuilder();
        sb.append("Today's date: ").append(today).append("\n");
        sb.append("User's display currency: ").append(displayCurrency).append("\n");
        sb.append("Data covers: last 3 months\n\n");

        // Current month — this is the most important section for "how much this month" questions
        sb.append("=== CURRENT MONTH (").append(monthLabel).append(", in progress) ===\n");
        sb.append(String.format("Income this month:   %s %.2f\n", displayCurrency, currentMonthIncome));
        sb.append(String.format("Expenses this month: %s %.2f\n", displayCurrency, currentMonthExpenses));
        sb.append(String.format("Net this month:      %s %.2f\n\n", displayCurrency, currentMonthIncome - currentMonthExpenses));

        // 3-month summary
        sb.append("=== 3-MONTH SUMMARY ===\n");
        sb.append(String.format("Total income:         %s %.2f\n", displayCurrency, totalIncome));
        sb.append(String.format("Total expenses:       %s %.2f\n", displayCurrency, totalExpenses));
        sb.append(String.format("Net savings:          %s %.2f\n", displayCurrency, totalIncome - totalExpenses));
        sb.append(String.format("Avg monthly income:   %s %.2f\n", displayCurrency, totalIncome / numMonths));
        sb.append(String.format("Avg monthly expenses: %s %.2f\n\n", displayCurrency, totalExpenses / numMonths));

        // Month-by-month breakdown
        if (!allMonths.isEmpty()) {
            sb.append("=== MONTHLY BREAKDOWN ===\n");
            for (String month : allMonths) {
                double mInc = incomeByMonth.getOrDefault(month, 0.0);
                double mExp = expenseByMonth.getOrDefault(month, 0.0);
                String tag = month.equals(currentMonthKey) ? " ← current month" : "";
                sb.append(String.format("%s: Income %s %.2f | Expenses %s %.2f | Net %s %.2f%s\n",
                        month, displayCurrency, mInc, displayCurrency, mExp,
                        displayCurrency, mInc - mExp, tag));
            }
            sb.append("\n");
        }

        // Expenses by category
        if (!expenseByCategory.isEmpty()) {
            sb.append("=== EXPENSES BY CATEGORY (3 months) ===\n");
            expenseByCategory.entrySet().stream()
                    .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                    .forEach(e -> sb.append(String.format("- %s: %s %.2f (avg %s %.2f/month)\n",
                            e.getKey(), displayCurrency, e.getValue(),
                            displayCurrency, e.getValue() / numMonths)));
            sb.append("\n");
        }

        // Income by source/category
        if (!incomeByCategory.isEmpty()) {
            sb.append("=== INCOME SOURCES (3 months) ===\n");
            incomeByCategory.entrySet().stream()
                    .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                    .forEach(e -> sb.append(String.format("- %s: %s %.2f\n",
                            e.getKey(), displayCurrency, e.getValue())));
            sb.append("\n");
        }

        // Subscriptions
        if (!subscriptions.isEmpty()) {
            sb.append(String.format("=== ACTIVE SUBSCRIPTIONS (%d total, %s %.2f/month) ===\n",
                    subscriptions.size(), displayCurrency, monthlySubscriptionCost));
            subscriptions.forEach(s -> {
                double amt = toDisplay(s.getAmount().doubleValue(), s.getCurrency(), exchangeRates, displayCurrency, eurToDisplay);
                sb.append(String.format("- %s: %s %.2f (%s)\n",
                        s.getDescription(), displayCurrency, amt, s.getFrequency()));
            });
            sb.append("\n");
        }

        // Exchange rates
        if (exchangeRates != null && !exchangeRates.isEmpty()) {
            sb.append("=== EXCHANGE RATES (1 EUR = ...) ===\n");
            exchangeRates.entrySet().stream()
                    .filter(e -> isPlausibleRate(e.getValue()))
                    .sorted(Map.Entry.comparingByKey())
                    .forEach(e -> sb.append(String.format("  %s: %.4f\n", e.getKey(), e.getValue())));
            sb.append("Use ONLY these rates for currency conversions. Do not use your own training data rates.\n\n");
        }

        sb.append(String.format("Always express amounts in %s in your response.\n", displayCurrency));
        return sb.toString();
    }

    /**
     * Converts an amount from its stored currency to the user's display currency.
     * All conversions go through EUR as the base (rates map is "1 EUR = X").
     */
    private double toDisplay(double amount, String storedCurrency,
                             Map<String, Double> rates, String displayCurrency, double eurToDisplay) {
        if (storedCurrency == null) return amount * eurToDisplay;
        String stored = storedCurrency.toUpperCase();
        String display = displayCurrency.toUpperCase();
        if (stored.equals(display)) return amount;

        // Convert stored → EUR
        double amountInEur;
        if ("EUR".equals(stored)) {
            amountInEur = amount;
        } else {
            Double eurToStored = (rates != null) ? rates.get(stored) : null;
            if (eurToStored == null || !isPlausibleRate(eurToStored)) return amount;
            amountInEur = amount / eurToStored;
        }

        // Convert EUR → display
        if ("EUR".equals(display)) return amountInEur;
        return amountInEur * eurToDisplay;
    }

    /** Reject exchange rates outside any realistic currency pair range (0.0001 – 100000). */
    private boolean isPlausibleRate(Double rate) {
        return rate != null && rate > 0.0001 && rate < 100_000;
    }
}
