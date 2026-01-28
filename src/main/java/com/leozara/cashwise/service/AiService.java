package com.leozara.cashwise.service;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class AiService {

    @Value("${groq.api.key}")
    private String apiKey;

    @Value("${groq.api.url}")
    private String apiUrl;

    @Value("${groq.model}")
    private String model;

    private final RestTemplate restTemplate;

    public AiService() {
        this.restTemplate = new RestTemplate();
    }

    public String suggestCategory(String description) {
        try {
            // 1. Monta o prompt
            String prompt = buildPrompt(description);

            // 2. Cria o request
            GroqRequest request = new GroqRequest(model, prompt);

            // 3. Configura headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            // 4. Monta a requisição completa
            HttpEntity<GroqRequest> entity = new HttpEntity<>(request, headers);

            // 5. Faz a chamada HTTP POST
            ResponseEntity<GroqResponse> response = restTemplate.postForEntity(
                    apiUrl,
                    entity,
                    GroqResponse.class
            );

            // 6. Extrai a categoria da resposta
            String category = response.getBody()
                    .getChoices()[0]
                    .getMessage()
                    .getContent()
                    .trim();

            return category;

        } catch (Exception e) {
            System.err.println("Erro ao chamar Groq AI: " + e.getMessage());
            e.printStackTrace();  // Mostra stack trace completo
            return "Outros";
        }
    }

    private String buildPrompt(String description) {
        return "Categorize this expense in ONE WORD ONLY. " +
                "Description: '" + description + "'. " +
                "Choose ONLY from: Food, Transport, Housing, Entertainment, Health, Education, Shopping, Other. " +
                "Return ONLY the category name, nothing else.";
    }

    // Inner classes com @Data do Lombok (gera getters/setters automaticamente)

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    static class GroqRequest {
        private String model;
        private GroqMessage[] messages;
        private int max_tokens;
        private double temperature;

        public GroqRequest(String model, String userMessage) {
            this.model = model;
            this.messages = new GroqMessage[]{
                    new GroqMessage("user", userMessage)
            };
            this.max_tokens = 20;
            this.temperature = 0.3;
        }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    static class GroqMessage {
        private String role;
        private String content;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    static class GroqResponse {
        private GroqChoice[] choices;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    static class GroqChoice {
        private GroqMessage message;
    }
}