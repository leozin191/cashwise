import { useState, useEffect } from 'react';
import { Text } from 'react-native';
import { useCurrency } from '../contexts/CurrencyContext';
import currencyService from '../services/currency';
import { getCurrencyByCode } from '../constants/currencies';

export default function CurrencyDisplay({ amountInEUR, originalCurrency, style, loading = '...' }) {
    const { currency } = useCurrency();
    const [displayValue, setDisplayValue] = useState(loading);

    useEffect(() => {
        const convert = async () => {
            try {
                let finalAmount;

                // Se tem moeda original e é diferente de EUR
                if (originalCurrency && originalCurrency !== 'EUR') {
                    // Converte de moeda original para EUR primeiro
                    finalAmount = await currencyService.convertToEUR(amountInEUR, originalCurrency);
                } else {
                    // Já está em EUR
                    finalAmount = amountInEUR;
                }

                // Agora converte de EUR para moeda selecionada
                const converted = await currencyService.convert(finalAmount, currency);
                const currencyInfo = getCurrencyByCode(currency);

                setDisplayValue(`${currencyInfo.symbol}${converted.toFixed(2)}`);
            } catch (error) {
                console.error('Error converting currency:', error);
                setDisplayValue(`${getCurrencyByCode(currency).symbol}${amountInEUR.toFixed(2)}`);
            }
        };

        convert();
    }, [amountInEUR, originalCurrency, currency]);

    return <Text style={style}>{displayValue}</Text>;
}