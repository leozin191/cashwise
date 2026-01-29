package com.leozara.cashwise.service;

import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class CategoryTranslationService {

    private final MessageSource messageSource;

    public String translateCategory(String englishCategory) {
        try {
            // Converte "Food" → "category.food"
            String key = "category." + englishCategory.toLowerCase();

            // Pega o locale atual (pt_BR ou en_US)
            Locale locale = LocaleContextHolder.getLocale();

            // Busca a tradução
            return messageSource.getMessage(key, null, englishCategory, locale);

        } catch (Exception e) {
            // Se não encontrar tradução, retorna o original
            return englishCategory;
        }
    }
}