package com.leozara.cashwise.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Slf4j
@Service
public class AiService {

    @Value("${groq.api.key}")
    private String groqApiKey;

    @Value("${groq.api.url}")
    private String groqApiUrl;

    @Value("${groq.model}")
    private String groqModel;

    private final RestTemplate restTemplate = new RestTemplate();

    private static final Set<String> VALID_CATEGORIES = Set.of(
            "Food", "Delivery", "Groceries", "Shopping", "Restaurants", "Transport", "Travel",
            "Entertainment", "Health", "Services", "General", "Utilities",
            "Cash", "Transfers", "Insurance", "Wealth", "Refund",
            "Cashback", "ChildAllowance", "Investment", "Loan", "Credit",
            "Savings", "Donation", "Salary", "Gift", "TopUps",
            "NetSales", "Interest", "Remittances"
    );

    @SuppressWarnings("unchecked")
    public String suggestCategory(String description) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(groqApiKey);

            String sanitized = description.length() > 200 ? description.substring(0, 200) : description;

            String prompt = "Categorize this expense: '" + sanitized +
                    "'. Return ONLY ONE category name from this exact list (use the exact spelling): " +
                    "Food, Delivery, Groceries, Shopping, Restaurants, Transport, Travel, Entertainment, Health, " +
                    "Services, General, Utilities, Cash, Transfers, Insurance, Wealth, Refund, " +
                    "Cashback, ChildAllowance, Investment, Loan, Credit, Savings, Donation, " +
                    "Salary, Gift, TopUps, NetSales, Interest, Remittances. " +
                    "Examples: " +
                    "- 'bought groceries at supermarket' -> Groceries, " +
                    "- 'ordered pizza on iFood' -> Delivery, " +
                    "- 'burger at McDonald's' -> Food, " +
                    "- 'lunch at restaurant' -> Restaurants, " +
                    "- 'paid electricity bill' -> Utilities, " +
                    "- 'uber ride' -> Transport. " +
                    "Return ONLY the category name, nothing else.";

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", groqModel);
            requestBody.put("messages", List.of(
                    Map.of("role", "user", "content", prompt)
            ));
            requestBody.put("temperature", 0.1);
            requestBody.put("max_tokens", 50);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    groqApiUrl,
                    HttpMethod.POST,
                    request,
                    (Class<Map<String, Object>>) (Class<?>) Map.class
            );

            Map<String, Object> responseBody = response.getBody();
            if (responseBody != null && responseBody.containsKey("choices")) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
                if (!choices.isEmpty()) {
                    Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                    String category = ((String) message.get("content")).trim();

                    if (VALID_CATEGORIES.contains(category)) {
                        return category;
                    }
                }
            }

            return "General";

        } catch (Exception e) {
            log.warn("Erro ao sugerir categoria: {}", e.getMessage());
            return "General";
        }
    }
}
