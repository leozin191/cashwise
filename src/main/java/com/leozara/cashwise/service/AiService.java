package com.leozara.cashwise.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class AiService {

    @Value("${groq.api.key}")
    private String groqApiKey;

    private static final String GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

    private static final Set<String> VALID_CATEGORIES = Set.of(
            "Food", "Delivery", "Groceries", "Shopping", "Restaurants", "Transport", "Travel",
            "Entertainment", "Health", "Services", "General", "Utilities",
            "Cash", "Transfers", "Insurance", "Wealth", "Refund",
            "Cashback", "ChildAllowance", "Investment", "Loan", "Credit",
            "Savings", "Donation", "Salary", "Gift", "TopUps",
            "NetSales", "Interest", "Remittances"
    );

    public String suggestCategory(String description) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(groqApiKey);

            String prompt = "Categorize this expense: '" + description +
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
            requestBody.put("model", "llama-3.3-70b-versatile");
            requestBody.put("messages", List.of(
                    Map.of("role", "user", "content", prompt)
            ));
            requestBody.put("temperature", 0.1);
            requestBody.put("max_tokens", 50);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Map> response = restTemplate.exchange(
                    GROQ_API_URL,
                    HttpMethod.POST,
                    request,
                    Map.class
            );

            Map<String, Object> responseBody = response.getBody();
            if (responseBody != null && responseBody.containsKey("choices")) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
                if (!choices.isEmpty()) {
                    Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                    String category = ((String) message.get("content")).trim();

                    // Valida se a categoria está na lista
                    if (VALID_CATEGORIES.contains(category)) {
                        return category;
                    }
                }
            }

            // Fallback para General se algo deu errado
            return "General";

        } catch (Exception e) {
            System.err.println("Erro ao sugerir categoria: " + e.getMessage());
            return "General";
        }
    }
}