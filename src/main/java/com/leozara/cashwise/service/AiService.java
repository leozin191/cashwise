package com.leozara.cashwise.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.leozara.cashwise.dto.BudgetAdviceDto;
import com.leozara.cashwise.dto.InsightDto;
import com.leozara.cashwise.dto.ParsedExpenseResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class AiService {

    @Value("${groq.api.key}")
    private String groqApiKey;

    @Value("${groq.api.url}")
    private String groqApiUrl;

    @Value("${groq.model}")
    private String groqModel;

    @Value("${groq.vision.model:llama-3.2-11b-vision-preview}")
    private String groqVisionModel;

    private final RestTemplate restTemplate = createRestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private record InsightsCacheEntry(List<InsightDto> data, long timestamp) {
        static final long TTL_MS = 6 * 60 * 60 * 1000L;
        boolean isFresh() { return System.currentTimeMillis() - timestamp < TTL_MS; }
    }
    private final Map<Long, InsightsCacheEntry> insightsCache = new ConcurrentHashMap<>();

    private static final String CATEGORIES =
            "Food, Delivery, Groceries, Shopping, Restaurants, Transport, Travel, " +
            "Entertainment, Health, Services, General, Utilities, Cash, Transfers, " +
            "Insurance, Wealth, Refund, Cashback, ChildAllowance, Investment, Loan, " +
            "Credit, Savings, Donation, Salary, Gift, TopUps, NetSales, Interest, Remittances";

    private static final Set<String> VALID_CATEGORIES = Set.of(
            "Food", "Delivery", "Groceries", "Shopping", "Restaurants", "Transport", "Travel",
            "Entertainment", "Health", "Services", "General", "Utilities",
            "Cash", "Transfers", "Insurance", "Wealth", "Refund",
            "Cashback", "ChildAllowance", "Investment", "Loan", "Credit",
            "Savings", "Donation", "Salary", "Gift", "TopUps",
            "NetSales", "Interest", "Remittances"
    );

    private static RestTemplate createRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(30_000);
        return new RestTemplate(factory);
    }

    public void invalidateInsightsCache(Long userId) {
        insightsCache.remove(userId);
    }

    // ── Category suggestion ────────────────────────────────────────────────────

    public String suggestCategory(String description) {
        if (!isConfigured()) return "General";
        try {
            String sanitized = description.length() > 200 ? description.substring(0, 200) : description;
            String prompt = "Categorize this expense: '" + sanitized +
                    "'. Return ONLY ONE category name from this exact list: " + CATEGORIES + ". " +
                    "Examples: 'bought groceries' -> Groceries, 'uber ride' -> Transport, " +
                    "'lunch at restaurant' -> Restaurants. Return ONLY the category name.";

            String result = callGroqText(prompt, groqModel, 50).trim();
            return VALID_CATEGORIES.contains(result) ? result : "General";
        } catch (Exception e) {
            log.warn("Error suggesting category: {}", e.getMessage());
            return "General";
        }
    }

    // ── Natural language expense parsing ───────────────────────────────────────

    public ParsedExpenseResponse parseExpense(String text, LocalDate today) {
        if (!isConfigured()) return new ParsedExpenseResponse(text, null, today.toString(), "General", null);
        try {
            String prompt = "Parse this expense description into a JSON object. Today is " + today + ".\n" +
                    "Input: \"" + text + "\"\n\n" +
                    "Return ONLY a JSON object with these exact keys:\n" +
                    "- \"description\": concise name (max 50 chars)\n" +
                    "- \"amount\": numeric value (null if not found)\n" +
                    "- \"date\": YYYY-MM-DD string (use today if not mentioned, null if unclear)\n" +
                    "- \"category\": one of [" + CATEGORIES + "]\n" +
                    "- \"currency\": 3-letter ISO code like EUR/USD (null if not mentioned)\n\n" +
                    "Examples:\n" +
                    "\"coffee 3.50\" -> {\"description\":\"Coffee\",\"amount\":3.50,\"date\":\"" + today + "\",\"category\":\"Food\",\"currency\":null}\n" +
                    "\"lunch 45 euros yesterday\" -> {\"description\":\"Lunch\",\"amount\":45.0,\"date\":\"" + today.minusDays(1) + "\",\"category\":\"Restaurants\",\"currency\":\"EUR\"}\n" +
                    "Return ONLY the JSON object, no other text.";

            String json = extractJson(callGroqText(prompt, groqModel, 250));
            ParsedExpenseResponse result = objectMapper.readValue(json, ParsedExpenseResponse.class);
            if (result.getDate() == null) result.setDate(today.toString());
            if (result.getCategory() == null || !VALID_CATEGORIES.contains(result.getCategory())) {
                result.setCategory("General");
            }
            return result;
        } catch (Exception e) {
            log.warn("Error parsing expense text: {}", e.getMessage());
            return new ParsedExpenseResponse(text, null, today.toString(), "General", null);
        }
    }

    // ── Spending coach chat ─────────────────────────────────────────────────────

    public String chat(String question, String spendingContext, List<Map<String, String>> history) {
        if (!isConfigured()) return "AI features require a GROQ_API_KEY to be configured.";
        try {
            String systemPrompt = "You are a friendly, concise personal finance assistant for CashWise. " +
                    "Give helpful, specific answers using actual numbers from the user's data when available. " +
                    "Keep responses under 200 words. Use bullet points for lists when appropriate.\n\n" +
                    "User's financial summary (last 3 months):\n" + spendingContext;

            List<Map<String, Object>> messages = new ArrayList<>();
            messages.add(Map.of("role", "system", "content", systemPrompt));

            // Include up to last 20 history messages (10 exchanges)
            if (history != null && !history.isEmpty()) {
                int start = Math.max(0, history.size() - 20);
                for (int i = start; i < history.size(); i++) {
                    Map<String, String> msg = history.get(i);
                    String role = msg.get("role");
                    String content = msg.get("content");
                    if (("user".equals(role) || "assistant".equals(role)) && content != null) {
                        messages.add(Map.of("role", role, "content", content));
                    }
                }
            }

            messages.add(Map.of("role", "user", "content", question));
            return callGroqMessages(messages, groqModel, 600, 0.65);
        } catch (Exception e) {
            log.warn("Error in AI chat: {}", e.getMessage());
            return "I'm having trouble analyzing your data right now. Please try again.";
        }
    }

    // ── Receipt scanning ───────────────────────────────────────────────────────

    public ParsedExpenseResponse scanReceipt(String base64Image, String mimeType, LocalDate today) {
        if (!isConfigured()) return new ParsedExpenseResponse(null, null, today.toString(), "General", null);
        try {
            String textPrompt = "Extract expense data from this receipt. Return ONLY a JSON object with keys:\n" +
                    "- \"description\": merchant or store name (max 50 chars)\n" +
                    "- \"amount\": total amount as a number (null if not visible)\n" +
                    "- \"date\": YYYY-MM-DD (null if not visible)\n" +
                    "- \"category\": one of [" + CATEGORIES + "]\n" +
                    "- \"currency\": 3-letter ISO code (null if not visible)\n" +
                    "Return ONLY the JSON object, no other text.";

            String dataUrl = "data:" + mimeType + ";base64," + base64Image;
            String json = extractJson(callGroqVision(dataUrl, textPrompt, 300));
            ParsedExpenseResponse result = objectMapper.readValue(json, ParsedExpenseResponse.class);
            if (result.getDate() == null) result.setDate(today.toString());
            if (result.getCategory() == null || !VALID_CATEGORIES.contains(result.getCategory())) {
                result.setCategory("General");
            }
            return result;
        } catch (Exception e) {
            log.warn("Error scanning receipt: {}", e.getMessage());
            return new ParsedExpenseResponse(null, null, today.toString(), "General", null);
        }
    }

    // ── AI insights ────────────────────────────────────────────────────────────

    public List<InsightDto> getInsights(String spendingContext, Long userId) {
        if (!isConfigured()) return List.of();
        InsightsCacheEntry cached = insightsCache.get(userId);
        if (cached != null && cached.isFresh()) {
            log.debug("Returning cached insights for user {}", userId);
            return cached.data();
        }
        try {
            String prompt = "Analyze this user's spending and generate 3 personalized financial insights.\n\n" +
                    "Spending data:\n" + spendingContext + "\n\n" +
                    "Return ONLY a JSON object with key \"insights\" containing an array. Each item has:\n" +
                    "- \"type\": \"anomaly\" | \"tip\" | \"trend\"\n" +
                    "- \"title\": short label (max 35 chars)\n" +
                    "- \"message\": actionable insight with specific numbers (max 110 chars)\n" +
                    "- \"icon\": \"warning-outline\" | \"bulb-outline\" | \"trending-up-outline\"\n\n" +
                    "Example: {\"insights\":[{\"type\":\"tip\",\"title\":\"Reduce delivery spend\",\"message\":\"You spend €120/month on delivery. Cooking twice more weekly could save €40.\",\"icon\":\"bulb-outline\"}]}\n" +
                    "Return ONLY the JSON object.";

            String json = extractJson(callGroqText(prompt, groqModel, 600));
            Map<String, Object> wrapper = objectMapper.readValue(json, new TypeReference<>() {});
            Object insightsRaw = wrapper.get("insights");
            if (insightsRaw == null) return List.of();
            String insightsJson = objectMapper.writeValueAsString(insightsRaw);
            List<InsightDto> result = objectMapper.readValue(insightsJson, new TypeReference<List<InsightDto>>() {});
            insightsCache.put(userId, new InsightsCacheEntry(result, System.currentTimeMillis()));
            return result;
        } catch (Exception e) {
            log.warn("Error generating insights: {}", e.getMessage());
            return List.of();
        }
    }

    // ── Budget advisor ──────────────────────────────────────────────────────────

    public List<BudgetAdviceDto> budgetAdvice(String spendingContext) {
        if (!isConfigured()) return List.of();
        try {
            String prompt = "Based on this spending data, suggest monthly budget limits for each category.\n\n" +
                    spendingContext + "\n\n" +
                    "Return ONLY a JSON object with key \"advice\" containing an array. Each item has:\n" +
                    "- \"category\": exact category name from the data\n" +
                    "- \"currentMonthlySpend\": average monthly spend as a number\n" +
                    "- \"suggestedBudget\": recommended monthly budget as a number (round to nearest 5)\n" +
                    "- \"reason\": one sentence explanation (max 80 chars)\n" +
                    "Only include top 5 categories by spend. Return ONLY the JSON object.\n" +
                    "Example: {\"advice\":[{\"category\":\"Food\",\"currentMonthlySpend\":450,\"suggestedBudget\":380,\"reason\":\"Reducing dining out twice a week could save €70/month.\"}]}";

            String json = extractJson(callGroqText(prompt, groqModel, 600));
            Map<String, Object> wrapper = objectMapper.readValue(json, new TypeReference<>() {});
            Object adviceRaw = wrapper.get("advice");
            if (adviceRaw == null) return List.of();
            String adviceJson = objectMapper.writeValueAsString(adviceRaw);
            return objectMapper.readValue(adviceJson, new TypeReference<List<BudgetAdviceDto>>() {});
        } catch (Exception e) {
            log.warn("Error generating budget advice: {}", e.getMessage());
            return List.of();
        }
    }

    // ── Income parsing ─────────────────────────────────────────────────────────

    public ParsedExpenseResponse parseIncome(String text, LocalDate today) {
        if (!isConfigured()) return new ParsedExpenseResponse(text, null, today.toString(), "Salary", null);
        try {
            String prompt = "Parse this income description into a JSON object. Today is " + today + ".\n" +
                    "Input: \"" + text + "\"\n\n" +
                    "Return ONLY a JSON object with these exact keys:\n" +
                    "- \"description\": concise label (max 50 chars)\n" +
                    "- \"amount\": numeric value (null if not found)\n" +
                    "- \"date\": YYYY-MM-DD string (use today if not mentioned)\n" +
                    "- \"category\": one of [Salary, Investment, Interest, NetSales, Gift, Remittances, Savings, Cashback]\n" +
                    "- \"currency\": 3-letter ISO code (null if not mentioned)\n\n" +
                    "Examples:\n" +
                    "\"salary 1500\" -> {\"description\":\"Monthly Salary\",\"amount\":1500.0,\"date\":\"" + today + "\",\"category\":\"Salary\",\"currency\":null}\n" +
                    "\"freelance 800 euros\" -> {\"description\":\"Freelance Payment\",\"amount\":800.0,\"date\":\"" + today + "\",\"category\":\"NetSales\",\"currency\":\"EUR\"}\n" +
                    "Return ONLY the JSON object.";

            String json = extractJson(callGroqText(prompt, groqModel, 200));
            ParsedExpenseResponse result = objectMapper.readValue(json, ParsedExpenseResponse.class);
            if (result.getDate() == null) result.setDate(today.toString());
            if (result.getCategory() == null) result.setCategory("Salary");
            return result;
        } catch (Exception e) {
            log.warn("Error parsing income text: {}", e.getMessage());
            return new ParsedExpenseResponse(text, null, today.toString(), "Salary", null);
        }
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private String callGroqText(String prompt, String model, int maxTokens) {
        return callGroqMessages(
                new ArrayList<>(List.of(Map.of("role", "user", "content", prompt))),
                model, maxTokens, 0.2);
    }

    @SuppressWarnings("unchecked")
    private String callGroqMessages(List<Map<String, Object>> messages, String model, int maxTokens, double temperature) {
        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("messages", messages);
        body.put("temperature", temperature);
        body.put("max_tokens", maxTokens);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, buildHeaders());
        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                groqApiUrl, HttpMethod.POST, request, (Class<Map<String, Object>>) (Class<?>) Map.class);
        return extractContent(response.getBody());
    }

    @SuppressWarnings("unchecked")
    private String callGroqVision(String imageDataUrl, String textPrompt, int maxTokens) {
        List<Map<String, Object>> content = List.of(
                Map.of("type", "image_url", "image_url", Map.of("url", imageDataUrl)),
                Map.of("type", "text", "text", textPrompt)
        );
        Map<String, Object> body = new HashMap<>();
        body.put("model", groqVisionModel);
        body.put("messages", List.of(Map.of("role", "user", "content", content)));
        body.put("temperature", 0.1);
        body.put("max_tokens", maxTokens);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, buildHeaders());
        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                groqApiUrl, HttpMethod.POST, request, (Class<Map<String, Object>>) (Class<?>) Map.class);
        return extractContent(response.getBody());
    }

    private boolean isConfigured() {
        return groqApiKey != null && !groqApiKey.isBlank();
    }

    private HttpHeaders buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(groqApiKey);
        return headers;
    }

    @SuppressWarnings("unchecked")
    private String extractContent(Map<String, Object> responseBody) {
        if (responseBody == null) return "";
        List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
        if (choices == null || choices.isEmpty()) return "";
        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
        return message == null ? "" : String.valueOf(message.get("content"));
    }

    private String extractJson(String text) {
        if (text == null) return "{}";
        text = text.trim();
        int objStart = text.indexOf('{');
        int objEnd = text.lastIndexOf('}');
        if (objStart >= 0 && objEnd > objStart) {
            return text.substring(objStart, objEnd + 1);
        }
        return text;
    }
}
