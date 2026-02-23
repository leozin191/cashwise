import { useState, useRef, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { aiService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, borderRadius, fontSize, fontFamily, shadows } from '../constants/theme';
import MarkdownText from '../components/MarkdownText';

const CHAT_KEY = '@ai_chat_history';

const QUICK_QUESTIONS_EN = [
    'How much did I spend this month?',
    'What are my top spending categories?',
    'Am I saving enough?',
    'Where can I cut back?',
    'How does this month compare to last month?',
    'What was my biggest expense?',
];

const QUICK_QUESTIONS_PT = [
    'Quanto gastei este mês?',
    'Quais são minhas principais categorias de gastos?',
    'Estou poupando o suficiente?',
    'Onde posso cortar gastos?',
    'Como este mês se compara ao mês passado?',
    'Qual foi meu maior gasto?',
];

let msgId = 0;
const makeMsg = (role, text) => ({ id: String(msgId++), role, text });

export default function AIChatScreen({ navigation }) {
    const { t, language } = useLanguage();
    const { colors } = useTheme();
    const styles = createStyles(colors);
    const QUICK_QUESTIONS = language === 'pt' ? QUICK_QUESTIONS_PT : QUICK_QUESTIONS_EN;

    const [messages, setMessages] = useState([
        makeMsg('assistant', t('aiChatWelcome') || "Hi! I'm your CashWise AI assistant. Ask me anything about your spending, savings, or financial habits."),
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [chipsVisible, setChipsVisible] = useState(true);
    const listRef = useRef(null);

    useEffect(() => {
        AsyncStorage.getItem(CHAT_KEY).then((raw) => {
            if (!raw) return;
            try {
                const saved = JSON.parse(raw);
                if (Array.isArray(saved) && saved.length > 0) {
                    setMessages(saved);
                    setChipsVisible(false);
                }
            } catch {}
        });
    }, []);

    useEffect(() => {
        if (messages.length > 1) {
            AsyncStorage.setItem(CHAT_KEY, JSON.stringify(messages)).catch(() => {});
        }
    }, [messages]);

    const clearChat = useCallback(async () => {
        await AsyncStorage.removeItem(CHAT_KEY);
        setMessages([makeMsg('assistant', t('aiChatWelcome') || "Hi! I'm your CashWise AI assistant. Ask me anything about your spending, savings, or financial habits.")]);
    }, [t]);

    const sendMessage = useCallback(async (text) => {
        const question = (text || input).trim();
        if (!question || loading) return;

        // Build conversation history from previous messages (skip welcome, last 10)
        const history = messages
            .slice(1)
            .slice(-10)
            .map((m) => ({ role: m.role, content: m.text }));

        setInput('');
        setChipsVisible(false);
        setMessages((prev) => [...prev, makeMsg('user', question)]);
        setLoading(true);

        try {
            const { answer } = await aiService.chat(question, history);
            setMessages((prev) => [...prev, makeMsg('assistant', answer)]);
        } catch {
            setMessages((prev) => [
                ...prev,
                makeMsg('assistant', t('aiChatError') || "Sorry, I couldn't process that. Please try again."),
            ]);
        } finally {
            setLoading(false);
            setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [input, loading, t, messages]);

    const renderMessage = ({ item }) => {
        const isUser = item.role === 'user';
        return (
            <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAssistant]}>
                {!isUser && (
                    <View style={styles.avatarAi}>
                        <Ionicons name="sparkles" size={14} color={colors.primary} />
                    </View>
                )}
                <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
                    {isUser ? (
                        <Text style={[styles.bubbleText, styles.bubbleTextUser]}>{item.text}</Text>
                    ) : (
                        <MarkdownText
                            text={item.text}
                            style={[styles.bubbleText, styles.bubbleTextAssistant]}
                        />
                    )}
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            {/* Header */}
            <LinearGradient colors={[colors.primaryGradientStart, colors.primaryGradientEnd]} style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <View style={styles.headerIcon}>
                        <Ionicons name="sparkles" size={18} color={colors.primary} />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>{t('aiAssistant') || 'AI Assistant'}</Text>
                        <Text style={styles.headerSub}>{t('poweredByGroq') || 'Powered by Groq'}</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.clearBtn} onPress={clearChat} activeOpacity={0.7}>
                    <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.8)" />
                </TouchableOpacity>
            </LinearGradient>

            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <FlatList
                    ref={listRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.messagesList}
                    onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
                    ListFooterComponent={loading ? (
                        <View style={[styles.msgRow, styles.msgRowAssistant]}>
                            <View style={styles.avatarAi}>
                                <Ionicons name="sparkles" size={14} color={colors.primary} />
                            </View>
                            <View style={[styles.bubble, styles.bubbleAssistant, styles.loadingBubble]}>
                                <ActivityIndicator size="small" color={colors.primary} />
                            </View>
                        </View>
                    ) : null}
                />

                {/* Quick question chips */}
                {chipsVisible && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.quickRow}
                        style={styles.quickScroll}
                    >
                        {QUICK_QUESTIONS.map((q) => (
                            <TouchableOpacity
                                key={q}
                                style={styles.quickChip}
                                onPress={() => sendMessage(q)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.quickChipText}>{q}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                {/* Input bar */}
                <View style={styles.inputBar}>
                    <TouchableOpacity
                        style={styles.chipsToggleBtn}
                        onPress={() => setChipsVisible((v) => !v)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={chipsVisible ? 'bulb' : 'bulb-outline'}
                            size={20}
                            color={chipsVisible ? colors.primary : colors.textLight}
                        />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.textInput}
                        placeholder={t('askAnything') || 'Ask anything about your finances...'}
                        placeholderTextColor={colors.textLighter}
                        value={input}
                        onChangeText={setInput}
                        multiline
                        maxLength={500}
                        returnKeyType="send"
                        onSubmitEditing={() => sendMessage()}
                        blurOnSubmit
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, (!input.trim() || loading) && styles.sendButtonDisabled]}
                        onPress={() => sendMessage()}
                        disabled={!input.trim() || loading}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="send" size={18} color={colors.textWhite} />
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors) =>
    StyleSheet.create({
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.xxl + spacing.md,
            paddingBottom: spacing.lg,
        },
        backBtn: { width: 40, alignItems: 'flex-start' },
        clearBtn: { width: 40, alignItems: 'flex-end' },
        headerCenter: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
        headerIcon: {
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
        },
        headerTitle: {
            fontSize: fontSize.lg,
            fontFamily: fontFamily.bold,
            color: '#fff',
        },
        headerSub: {
            fontSize: fontSize.xs,
            fontFamily: fontFamily.regular,
            color: 'rgba(255,255,255,0.7)',
        },
        container: { flex: 1 },
        messagesList: {
            padding: spacing.lg,
            paddingBottom: spacing.md,
        },
        msgRow: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            marginBottom: spacing.md,
        },
        msgRowUser: { justifyContent: 'flex-end' },
        msgRowAssistant: { justifyContent: 'flex-start' },
        avatarAi: {
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: colors.primaryBg,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: spacing.sm,
            flexShrink: 0,
        },
        bubble: {
            maxWidth: '78%',
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            borderRadius: borderRadius.xl,
        },
        bubbleUser: {
            backgroundColor: colors.primary,
            borderBottomRightRadius: 4,
        },
        bubbleAssistant: {
            backgroundColor: colors.surface,
            borderBottomLeftRadius: 4,
            ...shadows.small,
        },
        loadingBubble: {
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.xl,
        },
        bubbleText: {
            fontSize: fontSize.base,
            lineHeight: 22,
        },
        bubbleTextUser: {
            fontFamily: fontFamily.regular,
            color: colors.textWhite,
        },
        bubbleTextAssistant: {
            fontFamily: fontFamily.regular,
            color: colors.text,
        },
        quickScroll: {
            maxHeight: 44,
            marginBottom: spacing.sm,
        },
        quickRow: {
            paddingHorizontal: spacing.lg,
            gap: spacing.sm,
            alignItems: 'center',
        },
        quickChip: {
            backgroundColor: colors.primaryBg,
            borderRadius: borderRadius.full,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            borderWidth: 1,
            borderColor: colors.primary + '40',
        },
        quickChipText: {
            fontSize: fontSize.xs + 1,
            fontFamily: fontFamily.medium,
            color: colors.primary,
        },
        inputBar: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            gap: spacing.sm,
        },
        chipsToggleBtn: {
            width: 36,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 3,
        },
        textInput: {
            flex: 1,
            backgroundColor: colors.background,
            borderRadius: borderRadius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            fontSize: fontSize.base,
            fontFamily: fontFamily.regular,
            color: colors.text,
            maxHeight: 100,
        },
        sendButton: {
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
        },
        sendButtonDisabled: { opacity: 0.4 },
    });
