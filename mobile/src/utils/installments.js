export const getInstallmentMeta = (expense) => {
    const description = expense?.description?.trim();
    const match = description?.match(/\((\d+)\/(\d+)\)$/);
    if (!match) return null;
    const base = description.replace(/\s*\(\d+\/\d+\)$/, '').trim();
    return {
        index: parseInt(match[1], 10),
        total: parseInt(match[2], 10),
        base,
    };
};

export const isInstallmentExpense = (expense) => /\((\d+)\/(\d+)\)$/.test(expense?.description || '');

export const isSubscriptionExpense = (expense) => expense?.description?.includes('(Subscription)');

export const getInstallmentStartKey = (expense, meta) => {
    if (!expense?.date || !meta) return null;
    const date = new Date(expense.date);
    const start = new Date(date);
    start.setMonth(start.getMonth() - (meta.index - 1));
    return start.toISOString().split('T')[0];
};

export const buildInstallmentGroupMap = (sourceExpenses) => {
    const groups = new Map();
    const keyById = new Map();
    const noIdBuckets = new Map();

    sourceExpenses.forEach((exp) => {
        const meta = getInstallmentMeta(exp);
        if (!meta) return;
        const startKey = getInstallmentStartKey(exp, meta);
        const item = {
            ...exp,
            _installmentIndex: meta.index,
            _installmentTotal: meta.total,
            _installmentBase: meta.base,
            _installmentStartKey: startKey,
        };

        if (exp.groupId) {
            const key = `group:${exp.groupId}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    key,
                    groupId: exp.groupId,
                    title: meta.base,
                    totalCount: meta.total,
                    startKey,
                    items: [],
                });
            }
            groups.get(key).items.push(item);
            if (exp.id) keyById.set(exp.id, key);
            return;
        }

        const baseKey = [
            meta.base,
            meta.total,
            exp.currency || 'EUR',
            startKey || '',
        ].join('|');
        if (!noIdBuckets.has(baseKey)) {
            noIdBuckets.set(baseKey, []);
        }
        noIdBuckets.get(baseKey).push(item);
    });

    noIdBuckets.forEach((items, baseKey) => {
        const byIndex = new Map();
        items.forEach((item) => {
            const indexKey = item._installmentIndex || 0;
            if (!byIndex.has(indexKey)) byIndex.set(indexKey, []);
            byIndex.get(indexKey).push(item);
        });

        const maxGroups = Math.max(
            ...Array.from(byIndex.values()).map((list) => list.length),
            1
        );
        const buckets = Array.from({ length: maxGroups }, () => []);
        const indexKeys = Array.from(byIndex.keys()).sort((a, b) => a - b);

        indexKeys.forEach((indexKey) => {
            const list = byIndex.get(indexKey);
            list.sort((a, b) => {
                const dateDiff = new Date(a.date) - new Date(b.date);
                if (dateDiff !== 0) return dateDiff;
                return String(a.id || '').localeCompare(String(b.id || ''));
            });
            list.forEach((item, position) => {
                buckets[position].push(item);
            });
        });

        buckets.forEach((bucket, position) => {
            if (bucket.length === 0) return;
            const first = bucket[0];
            const key = `virtual:${baseKey}:${position}`;
            groups.set(key, {
                key,
                groupId: null,
                title: first._installmentBase,
                totalCount: first._installmentTotal,
                startKey: first._installmentStartKey,
                items: bucket,
            });
            bucket.forEach((item) => {
                if (item.id) keyById.set(item.id, key);
            });
        });
    });

    return { groupByKey: groups, keyById };
};

export const getInstallmentGroup = (expense, sourceExpenses, installmentGroupMap) => {
    const target = getInstallmentMeta(expense);
    if (!target) return [];
    const map = installmentGroupMap || buildInstallmentGroupMap(sourceExpenses);

    if (expense.groupId) {
        const key = `group:${expense.groupId}`;
        const group = map.groupByKey.get(key);
        return group ? [...group.items].sort((a, b) => a._installmentIndex - b._installmentIndex) : [];
    }

    if (expense.id) {
        const key = map.keyById.get(expense.id);
        const group = key ? map.groupByKey.get(key) : null;
        return group ? [...group.items].sort((a, b) => a._installmentIndex - b._installmentIndex) : [];
    }

    const targetStartKey = getInstallmentStartKey(expense, target);
    return sourceExpenses
        .map((exp) => {
            const meta = getInstallmentMeta(exp);
            if (!meta) return null;
            const startKey = getInstallmentStartKey(exp, meta);
            return {
                ...exp,
                _installmentIndex: meta.index,
                _installmentTotal: meta.total,
                _installmentBase: meta.base,
                _installmentStartKey: startKey,
            };
        })
        .filter(Boolean)
        .filter((exp) => (
            exp._installmentBase === target.base
            && exp._installmentTotal === target.total
            && (exp.currency || 'EUR') === (expense.currency || 'EUR')
            && exp._installmentStartKey === targetStartKey
        ))
        .sort((a, b) => a._installmentIndex - b._installmentIndex);
};
