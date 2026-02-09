import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { getCurrencyByCode } from '../constants/currencies';

const REMINDER_SETTINGS_KEY = '@reminder_settings';
const REMINDER_CHANNEL_ID = 'cashwise-reminders';
const DEFAULT_REMINDER_SETTINGS = {
    enabled: false,
    time: '09:00',
    daysBefore: [0, 1, 2],
};

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
    }),
});

const normalizeSettings = (settings) => {
    if (!settings) return { ...DEFAULT_REMINDER_SETTINGS };
    const daysBefore = Array.isArray(settings.daysBefore) ? settings.daysBefore : DEFAULT_REMINDER_SETTINGS.daysBefore;
    return {
        ...DEFAULT_REMINDER_SETTINGS,
        ...settings,
        daysBefore,
    };
};

export async function getReminderSettings() {
    try {
        const raw = await AsyncStorage.getItem(REMINDER_SETTINGS_KEY);
        return normalizeSettings(raw ? JSON.parse(raw) : null);
    } catch (error) {
        console.error('Error loading reminder settings:', error);
        return { ...DEFAULT_REMINDER_SETTINGS };
    }
}

export async function saveReminderSettings(settings) {
    try {
        const normalized = normalizeSettings(settings);
        await AsyncStorage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(normalized));
        return normalized;
    } catch (error) {
        console.error('Error saving reminder settings:', error);
        return normalizeSettings(settings);
    }
}

export async function ensureNotificationPermissions() {
    try {
        const settings = await Notifications.getPermissionsAsync();
        if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED) {
            return true;
        }

        const request = await Notifications.requestPermissionsAsync();
        return !!request.granted;
    } catch (error) {
        console.error('Error requesting notification permissions:', error);
        return false;
    }
}

const ensureChannel = async () => {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
        name: 'CashWise Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
    });
};

const parseTime = (timeString) => {
    if (!timeString) return { hour: 9, minute: 0 };
    const [hour, minute] = timeString.split(':').map((val) => parseInt(val, 10));
    return {
        hour: Number.isFinite(hour) ? hour : 9,
        minute: Number.isFinite(minute) ? minute : 0,
    };
};

const toDateKey = (date) => date.toISOString().split('T')[0];

const clampToDay = (date, day) => {
    const result = new Date(date.getFullYear(), date.getMonth(), day);
    if (result.getMonth() !== date.getMonth()) {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0);
    }
    return result;
};

const addFrequency = (date, frequency, dayOfMonth) => {
    const next = new Date(date);
    if (frequency === 'WEEKLY') {
        next.setDate(next.getDate() + 7);
        return next;
    }
    if (frequency === 'YEARLY') {
        next.setFullYear(next.getFullYear() + 1);
        return next;
    }

    next.setMonth(next.getMonth() + 1);
    if (dayOfMonth) {
        return clampToDay(next, dayOfMonth);
    }
    return next;
};

const getSubscriptionOccurrences = (subscription, horizonEnd) => {
    if (!subscription?.active) return [];
    const occurrences = [];
    const frequency = subscription.frequency || 'MONTHLY';
    const dayOfMonth = subscription.dayOfMonth ? Number(subscription.dayOfMonth) : null;

    let next = subscription.nextDueDate ? new Date(subscription.nextDueDate) : new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    while (next < today) {
        next = addFrequency(next, frequency, dayOfMonth);
    }

    while (next <= horizonEnd) {
        occurrences.push(new Date(next));
        next = addFrequency(next, frequency, dayOfMonth);
    }

    return occurrences;
};

const buildReminderContent = ({ title, body }) => ({
    title,
    body,
    sound: null,
});

export async function scheduleReminders({ expenses = [], subscriptions = [], t }) {
    const settings = await getReminderSettings();
    if (!settings.enabled) {
        await Notifications.cancelAllScheduledNotificationsAsync();
        return;
    }

    const granted = await ensureNotificationPermissions();
    if (!granted) return;

    await ensureChannel();
    await Notifications.cancelAllScheduledNotificationsAsync();

    const { hour, minute } = parseTime(settings.time);
    const today = new Date();
    const horizonEnd = new Date();
    horizonEnd.setDate(today.getDate() + 45);
    horizonEnd.setHours(23, 59, 59, 999);

    const installmentRegex = /\((\d+)\/(\d+)\)$/;
    const upcomingInstallments = expenses.filter((exp) => {
        if (!exp?.date) return false;
        if (!installmentRegex.test(exp.description || '')) return false;
        const date = new Date(exp.date);
        return date >= today && date <= horizonEnd;
    });

    const scheduleDate = (baseDate, daysBefore) => {
        const scheduled = new Date(baseDate);
        scheduled.setDate(scheduled.getDate() - daysBefore);
        scheduled.setHours(hour, minute, 0, 0);
        return scheduled;
    };

    const dueTextForDays = (daysBefore) => (
        daysBefore === 0
            ? t('reminderDueToday')
            : t('reminderDueInDays').replace('{days}', String(daysBefore))
    );

    const scheduledKeys = new Set();

    for (const exp of upcomingInstallments) {
        const match = exp.description?.match(installmentRegex);
        const baseDescription = exp.description?.replace(/\s*\(\d+\/\d+\)$/, '').trim() || exp.description;
        const installmentInfo = match ? `${match[1]}/${match[2]}` : '';
        const symbol = getCurrencyByCode(exp.currency || 'EUR').symbol;
        const amountText = `${symbol}${Number(exp.amount).toFixed(2)}`;
        const dueDate = new Date(exp.date);

        for (const daysBefore of settings.daysBefore) {
            const triggerDate = scheduleDate(dueDate, daysBefore);
            if (triggerDate <= new Date()) continue;
            if (triggerDate > horizonEnd) continue;

            const key = `${exp.id}-${daysBefore}-${toDateKey(triggerDate)}`;
            if (scheduledKeys.has(key)) continue;
            scheduledKeys.add(key);

            await Notifications.scheduleNotificationAsync({
                content: buildReminderContent({
                    title: `${t('installmentOf')} ${dueTextForDays(daysBefore)}`,
                    body: `${baseDescription}${installmentInfo ? ` (${installmentInfo})` : ''} · ${amountText}`,
                }),
                trigger: {
                    date: triggerDate,
                    channelId: REMINDER_CHANNEL_ID,
                },
            });
        }
    }

    for (const subscription of subscriptions || []) {
        if (!subscription?.active) continue;
        const occurrences = getSubscriptionOccurrences(subscription, horizonEnd);
        const symbol = getCurrencyByCode(subscription.currency || 'EUR').symbol;
        const amountText = `${symbol}${Number(subscription.amount).toFixed(2)}`;

        for (const dueDate of occurrences) {
            for (const daysBefore of settings.daysBefore) {
                const triggerDate = scheduleDate(dueDate, daysBefore);
                if (triggerDate <= new Date()) continue;
                if (triggerDate > horizonEnd) continue;

                const key = `sub-${subscription.id}-${daysBefore}-${toDateKey(triggerDate)}`;
                if (scheduledKeys.has(key)) continue;
                scheduledKeys.add(key);

                await Notifications.scheduleNotificationAsync({
                    content: buildReminderContent({
                        title: `${t('subscriptionSingle')} ${dueTextForDays(daysBefore)}`,
                        body: `${subscription.description || t('subscriptions')} · ${amountText}`,
                    }),
                    trigger: {
                        date: triggerDate,
                        channelId: REMINDER_CHANNEL_ID,
                    },
                });
            }
        }
    }
}
