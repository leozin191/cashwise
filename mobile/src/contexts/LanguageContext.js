import { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { translate } from '../constants/translations';

const SUPPORTED = ['pt', 'en'];

function detectLocale() {
    try {
        const locales = getLocales();
        const tag = locales?.[0]?.languageTag ?? '';
        const lang = tag.split('-')[0].toLowerCase();
        return SUPPORTED.includes(lang) ? lang : 'en';
    } catch {
        return 'en';
    }
}

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState('en');

    useEffect(() => {
        loadLanguagePreference();
    }, []);

    const loadLanguagePreference = async () => {
        try {
            const savedLanguage = await AsyncStorage.getItem('@language');
            if (savedLanguage && SUPPORTED.includes(savedLanguage)) {
                setLanguage(savedLanguage);
            } else {
                setLanguage(detectLocale());
            }
        } catch (error) {
            console.error('Error loading language:', error);
            setLanguage(detectLocale());
        }
    };

    const t = (key) => translate(language, key);

    const changeLanguage = async (lang) => {
        setLanguage(lang);
        try {
            await AsyncStorage.setItem('@language', lang);
        } catch (error) {
            console.error('Error saving language:', error);
        }
    };

    return (
        <LanguageContext.Provider value={{ language, changeLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within LanguageProvider');
    }
    return context;
};
