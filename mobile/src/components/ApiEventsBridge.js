import { useEffect } from 'react';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useLanguage } from '../contexts/LanguageContext';
import { setApiHandlers } from '../services/api';

export default function ApiEventsBridge() {
    const { showSnackbar } = useSnackbar();
    const { t } = useLanguage();

    useEffect(() => {
        setApiHandlers({
            onError: (messageKey) => {
                const message = messageKey ? t(messageKey) : t('networkError');
                showSnackbar({ message, type: 'error' });
            },
            onOffline: (messageKey) => {
                const message = messageKey ? t(messageKey) : t('usingCachedData');
                showSnackbar({ message, type: 'info' });
            },
        });

        return () => setApiHandlers({ onError: null, onOffline: null });
    }, [showSnackbar, t]);

    return null;
}
