import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { expenseService, subscriptionService } from '../services/api';
import { getBudgets } from './budgets';

const AUTO_BACKUP_ENABLED_KEY = '@auto_backup_enabled';
const AUTO_BACKUP_TIMESTAMP_KEY = '@auto_backup_timestamp';
const AUTO_BACKUP_PATH = `${FileSystem.documentDirectory}cashwise-auto-backup.json`;
const AUTO_BACKUP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export const autoBackupKeys = {
    enabled: AUTO_BACKUP_ENABLED_KEY,
    timestamp: AUTO_BACKUP_TIMESTAMP_KEY,
    path: AUTO_BACKUP_PATH,
};

export async function getAutoBackupMeta() {
    const [enabledRaw, timestampRaw] = await Promise.all([
        AsyncStorage.getItem(AUTO_BACKUP_ENABLED_KEY),
        AsyncStorage.getItem(AUTO_BACKUP_TIMESTAMP_KEY),
    ]);
    return {
        enabled: enabledRaw === 'true',
        timestamp: timestampRaw ? Number(timestampRaw) : null,
        path: AUTO_BACKUP_PATH,
    };
}

export async function setAutoBackupEnabled(enabled) {
    await AsyncStorage.setItem(AUTO_BACKUP_ENABLED_KEY, enabled ? 'true' : 'false');
}

export async function createBackupPayload() {
    const expenses = await expenseService.getAll();
    let subscriptions = [];
    try {
        subscriptions = await subscriptionService.getAll();
    } catch (error) {}

    const budgets = await getBudgets();
    const [language, currency, theme] = await Promise.all([
        AsyncStorage.getItem('@language'),
        AsyncStorage.getItem('@currency'),
        AsyncStorage.getItem('@theme'),
    ]);

    return {
        version: 1,
        exportDate: new Date().toISOString(),
        expenses,
        subscriptions,
        budgets,
        settings: {
            language,
            currency,
            theme,
        },
    };
}

export async function saveAutoBackup(payload) {
    await FileSystem.writeAsStringAsync(
        AUTO_BACKUP_PATH,
        JSON.stringify(payload, null, 2),
        { encoding: 'utf8' }
    );
    await AsyncStorage.setItem(AUTO_BACKUP_TIMESTAMP_KEY, String(Date.now()));
    return AUTO_BACKUP_PATH;
}

export async function runAutoBackupIfDue({ force = false } = {}) {
    const meta = await getAutoBackupMeta();
    if (!meta.enabled) return { skipped: true, reason: 'disabled' };

    const now = Date.now();
    if (!force && meta.timestamp && now - meta.timestamp < AUTO_BACKUP_INTERVAL_MS) {
        return { skipped: true, reason: 'recent' };
    }

    const payload = await createBackupPayload();
    await saveAutoBackup(payload);
    return { skipped: false, timestamp: Date.now() };
}

export async function loadAutoBackupPayload() {
    const exists = await FileSystem.getInfoAsync(AUTO_BACKUP_PATH);
    if (!exists.exists) return null;
    const content = await FileSystem.readAsStringAsync(AUTO_BACKUP_PATH, { encoding: 'utf8' });
    return JSON.parse(content);
}

export async function restoreBackupPayload(backup) {
    if (!backup?.version || !backup?.expenses) {
        throw new Error('invalid-backup');
    }

    const existing = await expenseService.getAll();
    for (const exp of existing) {
        await expenseService.delete(exp.id);
    }

    for (const exp of backup.expenses) {
        const { id, createdAt, updatedAt, ...data } = exp;
        await expenseService.create(data);
    }

    if (backup.subscriptions?.length > 0) {
        try {
            const existingSubs = await subscriptionService.getAll();
            for (const sub of existingSubs) {
                await subscriptionService.delete(sub.id);
            }
            for (const sub of backup.subscriptions) {
                const { id, createdAt, updatedAt, ...data } = sub;
                await subscriptionService.create(data);
            }
        } catch (error) {}
    }

    if (backup.budgets) {
        await AsyncStorage.setItem('@budgets', JSON.stringify(backup.budgets));
    }

    if (backup.settings) {
        if (backup.settings.language) await AsyncStorage.setItem('@language', backup.settings.language);
        if (backup.settings.currency) await AsyncStorage.setItem('@currency', backup.settings.currency);
        if (backup.settings.theme) await AsyncStorage.setItem('@theme', backup.settings.theme);
    }
}
