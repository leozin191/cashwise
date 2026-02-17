import { useState, useEffect, useRef } from 'react';
import { Text } from 'react-native';
import { useCurrency } from '../contexts/CurrencyContext';
import currencyService from '../services/currency';
import { getCurrencyByCode } from '../constants/currencies';

export default function CurrencyDisplay({
    amountInEUR,
    originalCurrency,
    style,
    loading = '...',
    numberOfLines,
    ellipsizeMode,
}) {
    const { currency } = useCurrency();
    const [displayValue, setDisplayValue] = useState(loading);
    const requestIdRef = useRef(0);

    useEffect(() => {
        let isActive = true;
        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;

        const convert = async () => {
            try {
                const safeAmount = Number(amountInEUR) || 0;
                const baseCurrency = originalCurrency || 'EUR';
                let finalAmount;

                if (baseCurrency !== 'EUR') {
                    finalAmount = await currencyService.convertToEUR(safeAmount, baseCurrency);
                } else {
                    finalAmount = safeAmount;
                }

                const converted = await currencyService.convert(finalAmount, currency);
                const currencyInfo = getCurrencyByCode(currency);

                if (!isActive || requestIdRef.current !== requestId) return;
                setDisplayValue(`${currencyInfo.symbol}${converted.toFixed(2)}`);
            } catch (error) {
                console.error('Error converting currency:', error);
                if (!isActive || requestIdRef.current !== requestId) return;
                const safeAmount = Number(amountInEUR) || 0;
                setDisplayValue(`${getCurrencyByCode(currency).symbol}${safeAmount.toFixed(2)}`);
            }
        };

        convert();

        return () => {
            isActive = false;
        };
    }, [amountInEUR, originalCurrency, currency]);

    return (
        <Text style={style} numberOfLines={numberOfLines} ellipsizeMode={ellipsizeMode}>
            {displayValue}
        </Text>
    );
}
