import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://open.er-api.com/v6/latest/EUR';
const CACHE_KEY = '@exchange_rates';
const CACHE_TIMESTAMP_KEY = '@exchange_rates_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

class CurrencyService {
    constructor() {
        this.rates = null;
        this.lastUpdate = null;
    }

    // Busca taxas de câmbio da API
    async fetchRates() {
        try {
            const response = await fetch(API_BASE);
            const data = await response.json();

            if (data.result === 'success') {
                this.rates = data.rates;
                this.lastUpdate = Date.now();

                // Salva no cache
                await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data.rates));
                await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, this.lastUpdate.toString());

                return data.rates;
            }

            throw new Error('Failed to fetch rates');
        } catch (error) {
            console.error('Error fetching exchange rates:', error);
            // Se falhar, tenta usar cache
            return await this.loadFromCache();
        }
    }

    // Carrega taxas do cache
    async loadFromCache() {
        try {
            const cachedRates = await AsyncStorage.getItem(CACHE_KEY);
            const cachedTimestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);

            if (cachedRates && cachedTimestamp) {
                this.rates = JSON.parse(cachedRates);
                this.lastUpdate = parseInt(cachedTimestamp);
                return this.rates;
            }
        } catch (error) {
            console.error('Error loading from cache:', error);
        }

        return null;
    }

    // Verifica se cache está válido
    isCacheValid() {
        if (!this.lastUpdate) return false;
        return (Date.now() - this.lastUpdate) < CACHE_DURATION;
    }

    // Pega taxas (do cache ou API)
    async getRates() {
        // Se tem cache válido, usa
        if (this.rates && this.isCacheValid()) {
            return this.rates;
        }

        // Tenta carregar do cache primeiro
        const cachedRates = await this.loadFromCache();
        if (cachedRates && this.isCacheValid()) {
            return cachedRates;
        }

        // Se não tem cache válido, busca da API
        return await this.fetchRates();
    }

    // Converte valor de EUR para outra moeda
    async convert(amountInEUR, toCurrency) {
        if (toCurrency === 'EUR') {
            return amountInEUR;
        }

        const rates = await this.getRates();

        if (!rates || !rates[toCurrency]) {
            console.warn(`Rate not found for ${toCurrency}, using EUR`);
            return amountInEUR;
        }

        return amountInEUR * rates[toCurrency];
    }

    // Converte de qualquer moeda para EUR
    async convertToEUR(amount, fromCurrency) {
        if (fromCurrency === 'EUR') {
            return amount;
        }

        const rates = await this.getRates();

        if (!rates || !rates[fromCurrency]) {
            console.warn(`Rate not found for ${fromCurrency}, assuming EUR`);
            return amount;
        }

        return amount / rates[fromCurrency];
    }

    // Força atualização das taxas
    async forceUpdate() {
        return await this.fetchRates();
    }

    // Pega timestamp da última atualização
    getLastUpdateTimestamp() {
        return this.lastUpdate;
    }

    // Pega taxa específica
    async getRate(currency) {
        const rates = await this.getRates();
        return rates ? rates[currency] : null;
    }
}

export default new CurrencyService();