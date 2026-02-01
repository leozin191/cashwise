export const translations = {
    pt: {
        // Header
        appName: 'CashWise',
        total: 'Total',
        expenses: 'Despesas',

        // Categorias
        categories: {
            Food: 'Comida',
            Transport: 'Transporte',
            Housing: 'Moradia',
            Entertainment: 'Entretenimento',
            Health: 'Saúde',
            Education: 'Educação',
            Shopping: 'Compras',
            Other: 'Outros',
        },

        // Tela principal
        chartTitle: 'Gastos por Categoria',
        tapToSeeDetails: 'Toque para ver detalhes',
        // Filtros
        thisMonth: 'Este mês',
        last30Days: 'Últimos 30 dias',
        all: 'Tudo',
        // Filtros vazios
        noExpensesThisMonth: 'Nenhuma despesa este mês',
        noExpensesLast30Days: 'Nenhuma despesa nos últimos 30 dias',
        tryAnotherPeriod: 'Tente outro período',
        noExpenses: 'Nenhuma despesa ainda',
        noExpensesSubtext: 'Toque no botão + para começar',
        loading: 'Carregando...',

        // Modal adicionar/editar
        newExpense: 'Nova Despesa',
        editExpense: 'Editar Despesa',
        description: 'Descrição',
        descriptionPlaceholder: 'Ex: Pizza no restaurante',
        amount: 'Valor',
        category: 'Categoria',
        categoryOptional: 'Categoria (Opcional)',
        aiBanner: 'Deixe a categoria vazia e a IA categoriza automaticamente!',
        addExpense: 'Adicionar Despesa',
        saveChanges: 'Salvar Alterações',
        saving: 'Salvando...',

        // Alertas
        success: 'Sucesso!',
        error: 'Erro',
        deleted: 'Deletado!',
        expenseDeleted: 'Despesa removida com sucesso',
        expenseAdded: 'Despesa adicionada!',
        expenseUpdated: 'Despesa atualizada!',
        aiCategorized: 'IA categorizou como:',
        couldNotLoad: 'Não foi possível carregar as despesas.',
        couldNotDelete: 'Não foi possível deletar',
        couldNotSave: 'Não foi possível salvar a despesa',
        enterDescription: 'Digite uma descrição',
        enterValidAmount: 'Digite um valor válido',
        confirm: 'Confirmar',
        deleteConfirm: 'Deseja deletar esta despesa?',
        cancel: 'Cancelar',
        delete: 'Deletar',
        attention: 'Atenção',
    },

    en: {
        // Header
        appName: 'CashWise',
        total: 'Total',
        expenses: 'Expenses',

        // Categories
        categories: {
            Food: 'Food',
            Transport: 'Transport',
            Housing: 'Housing',
            Entertainment: 'Entertainment',
            Health: 'Health',
            Education: 'Education',
            Shopping: 'Shopping',
            Other: 'Other',
        },

        // Main screen
        chartTitle: 'Expenses by Category',
        tapToSeeDetails: 'Tap to see details',
        // Filters
        thisMonth: 'This month',
        last30Days: 'Last 30 days',
        all: 'All',
        // Empty filters
        noExpensesThisMonth: 'No expenses this month',
        noExpensesLast30Days: 'No expenses in the last 30 days',
        tryAnotherPeriod: 'Try another period',
        noExpenses: 'No expenses yet',
        noExpensesSubtext: 'Tap the + button to get started',
        loading: 'Loading...',

        // Add/edit modal
        newExpense: 'New Expense',
        editExpense: 'Edit Expense',
        description: 'Description',
        descriptionPlaceholder: 'e.g., Pizza at restaurant',
        amount: 'Amount',
        category: 'Category',
        categoryOptional: 'Category (Optional)',
        aiBanner: 'Leave category empty and AI will categorize automatically!',
        addExpense: 'Add Expense',
        saveChanges: 'Save Changes',
        saving: 'Saving...',

        // Alerts
        success: 'Success!',
        error: 'Error',
        deleted: 'Deleted!',
        expenseDeleted: 'Expense successfully removed',
        expenseAdded: 'Expense added!',
        expenseUpdated: 'Expense updated!',
        aiCategorized: 'AI categorized as:',
        couldNotLoad: 'Could not load expenses.',
        couldNotDelete: 'Could not delete',
        couldNotSave: 'Could not save expense',
        enterDescription: 'Enter a description',
        enterValidAmount: 'Enter a valid amount',
        confirm: 'Confirm',
        deleteConfirm: 'Do you want to delete this expense?',
        cancel: 'Cancel',
        delete: 'Delete',
        attention: 'Attention',
    },
};

// Função helper para pegar tradução
export const translate = (lang, key) => {
    const keys = key.split('.');
    let value = translations[lang];

    for (const k of keys) {
        value = value?.[k];
    }

    return value || key;
};