import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { expenseService, incomeService, subscriptionService } from '../services/api';
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
    const warnings = [];
    const expenses = await expenseService.getAll();

    let incomes = [];
    try {
        incomes = await incomeService.getAll();
    } catch (error) {
        warnings.push('incomes');
    }

    let subscriptions = [];
    try {
        subscriptions = await subscriptionService.getAll();
    } catch (error) {
        warnings.push('subscriptions');
    }

    const budgets = await getBudgets();
    const [language, currency, theme] = await Promise.all([
        AsyncStorage.getItem('@language'),
        AsyncStorage.getItem('@currency'),
        AsyncStorage.getItem('@theme'),
    ]);

    return {
        version: 2,
        exportDate: new Date().toISOString(),
        expenses,
        incomes,
        subscriptions,
        budgets,
        settings: {
            language,
            currency,
            theme,
        },
        ...(warnings.length > 0 && { warnings }),
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
    try {
        return JSON.parse(content);
    } catch {
        return null;
    }
}

export async function restoreBackupPayload(backup) {
    if (!backup?.version || !Array.isArray(backup?.expenses)) {
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

    if (Array.isArray(backup.incomes) && backup.incomes.length > 0) {
        const existingIncomes = await incomeService.getAll();
        for (const inc of existingIncomes) {
            await incomeService.delete(inc.id);
        }
        for (const inc of backup.incomes) {
            const { id, createdAt, updatedAt, ...data } = inc;
            await incomeService.create(data);
        }
    }

    if (Array.isArray(backup.subscriptions) && backup.subscriptions.length > 0) {
        const existingSubs = await subscriptionService.getAll();
        for (const sub of existingSubs) {
            await subscriptionService.delete(sub.id);
        }
        for (const sub of backup.subscriptions) {
            const { id, createdAt, updatedAt, ...data } = sub;
            await subscriptionService.create(data);
        }
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
