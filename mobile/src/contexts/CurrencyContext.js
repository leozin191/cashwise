import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import currencyService from '../services/currency';
import { getCurrencyByCode } from '../constants/currencies';

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
    const [currency, setCurrency] = useState('EUR');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadCurrencyPreference();
        // Carrega taxas ao iniciar
        currencyService.getRates();
    }, []);

    const loadCurrencyPreference = async () => {
        try {
            const savedCurrency = await AsyncStorage.getItem('@currency');
            if (savedCurrency) {
                setCurrency(savedCurrency);
            }
        } catch (error) {
            console.error('Error loading currency:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const changeCurrency = async (newCurrency) => {
        try {
            setCurrency(newCurrency);
            await AsyncStorage.setItem('@currency', newCurrency);
        } catch (error) {
            console.error('Error saving currency:', error);
        }
    };

    const convertFromEUR = async (amountInEUR) => {
        return await currencyService.convert(amountInEUR, currency);
    };

    const formatAmount = async (amountInEUR) => {
        const converted = await convertFromEUR(amountInEUR);
        const currencyInfo = getCurrencyByCode(currency);
        return `${currencyInfo.symbol}${converted.toFixed(2)}`;
    };

    return (
        <CurrencyContext.Provider value={{
            currency,
            changeCurrency,
            convertFromEUR,
            formatAmount,
            isLoading,
            getCurrencyInfo: () => getCurrencyByCode(currency)
        }}>
            {children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = () => {
    const context = useContext(CurrencyContext);
    if (!context) {
        throw new Error('useCurrency must be used within CurrencyProvider');
    }
    return context;
};