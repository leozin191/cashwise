package com.leozara.cashwise.service;

import com.leozara.cashwise.exception.ResourceNotFoundException;
import com.leozara.cashwise.model.Income;
import com.leozara.cashwise.repository.IncomeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class IncomeService {

    private final IncomeRepository incomeRepository;

    @Transactional
    public Income createIncome(Income income, Long userId) {
        income.setUserId(userId);
        return incomeRepository.save(income);
    }

    public List<Income> getAllIncomes(Long userId) {
        return incomeRepository.findByUserId(userId);
    }

    public Page<Income> getAllIncomes(Long userId, Pageable pageable) {
        return incomeRepository.findByUserId(userId, pageable);
    }

    public Income getIncomeById(Long id, Long userId) {
        return incomeRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Income not found with ID: " + id));
    }

    @Transactional
    public Income updateIncome(Long id, Income incomeDetails, Long userId) {
        Income income = incomeRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Income not found with ID: " + id));

        income.setDescription(incomeDetails.getDescription());
        income.setAmount(incomeDetails.getAmount());
        income.setCurrency(incomeDetails.getCurrency());
        income.setDate(incomeDetails.getDate());

        return incomeRepository.save(income);
    }

    @Transactional
    public void deleteIncome(Long id, Long userId) {
        Income income = incomeRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Income not found with ID: " + id));
        incomeRepository.delete(income);
    }

    public List<Income> getIncomesByDateRange(LocalDate startDate, LocalDate endDate, Long userId) {
        return incomeRepository.findByDateBetweenAndUserId(startDate, endDate, userId);
    }

    public List<Income> getIncomesByCurrency(String currency, Long userId) {
        return incomeRepository.findByCurrencyAndUserId(currency, userId);
    }

    public List<Income> getIncomesByDate(LocalDate date, Long userId) {
        return incomeRepository.findByDateAndUserId(date, userId);
    }
}
