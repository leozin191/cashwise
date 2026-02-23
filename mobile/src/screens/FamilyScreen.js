import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    Modal,
    StyleSheet,
    RefreshControl,
    TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import { householdService } from '../services/api';
import { spacing, fontSize, fontFamily, borderRadius, shadows } from '../constants/theme';

export default function FamilyScreen() {
    const navigation = useNavigation();
    const { colors } = useTheme();
    const { t } = useLanguage();
    const { user } = useAuth();
    const { showSuccess } = useSnackbar();

    const [household, setHousehold] = useState(null);
    const [pendingInvites, setPendingInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [inviteInput, setInviteInput] = useState('');
    const [renameInput, setRenameInput] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [hData, invites] = await Promise.all([
                householdService.getMyHousehold().catch(() => null),
                householdService.getPendingInvitations().catch(() => []),
            ]);
            setHousehold(hData);
            setPendingInvites(invites || []);
        } catch (e) {
            console.error('FamilyScreen load error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleInvite = async () => {
        if (!inviteInput.trim()) return;
        setSubmitting(true);
        try {
            await householdService.inviteMember(inviteInput.trim());
            setShowInviteModal(false);
            setInviteInput('');
            showSuccess(t('inviteSent'));
            loadData();
        } catch (e) {
            Alert.alert(t('error'), e?.response?.data?.message || t('somethingWentWrong'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleRename = async () => {
        if (!renameInput.trim()) return;
        setSubmitting(true);
        try {
            if (household) {
                await householdService.renameHousehold(renameInput.trim());
                showSuccess(t('householdRenamed'));
            } else {
                await householdService.createHousehold(renameInput.trim());
                showSuccess(t('householdCreated'));
            }
            setShowRenameModal(false);
            setRenameInput('');
            loadData();
        } catch (e) {
            Alert.alert(t('error'), e?.response?.data?.message || t('somethingWentWrong'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemoveMember = (member) => {
        Alert.alert(
            t('removeMember'),
            `${t('removeMember')} ${member.name}?`,
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('removeMember'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await householdService.removeMember(member.userId);
                            showSuccess(t('memberRemoved'));
                            loadData();
                        } catch (e) {
                            Alert.alert(t('error'), e?.response?.data?.message || t('somethingWentWrong'));
                        }
                    },
                },
            ]
        );
    };

    const handleLeave = () => {
        Alert.alert(
            t('leaveHousehold'),
            t('leaveHousehold') + '?',
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('leaveHousehold'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await householdService.leaveHousehold();
                            showSuccess(t('leftHousehold'));
                            loadData();
                        } catch (e) {
                            Alert.alert(t('error'), e?.response?.data?.message || t('somethingWentWrong'));
                        }
                    },
                },
            ]
        );
    };

    const handleAcceptInvite = async (token) => {
        try {
            await householdService.acceptInvitation(token);
            showSuccess(t('inviteAccepted'));
            loadData();
        } catch (e) {
            Alert.alert(t('error'), e?.response?.data?.message || t('somethingWentWrong'));
        }
    };

    const handleDeclineInvite = async (token) => {
        try {
            await householdService.declineInvitation(token);
            showSuccess(t('inviteDeclined'));
            loadData();
        } catch (e) {
            Alert.alert(t('error'), t('somethingWentWrong'));
        }
    };

    const styles = createStyles(colors);

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator color={colors.primary} size="large" />
            </View>
        );
    }

    const isOwner = household?.myRole === 'OWNER';

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.headerTopRow}>
                    <View style={styles.headerTitleRow}>
                        <Ionicons name="people" size={22} color={colors.textWhite} style={{ marginRight: spacing.sm }} />
                        <Text style={styles.headerTitle}>
                            {household ? household.name : t('myHousehold')}
                        </Text>
                        {isOwner && household && (
                            <TouchableOpacity
                                onPress={() => {
                                    setRenameInput(household.name);
                                    setShowRenameModal(true);
                                }}
                                style={{ marginLeft: spacing.sm }}
                            >
                                <Ionicons name="pencil-outline" size={16} color={colors.textWhite} />
                            </TouchableOpacity>
                        )}
                    </View>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                        <Ionicons name="close" size={20} color={colors.textWhite} />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.primary} />}
            >
                {/* Pending Invitations for current user */}
                {pendingInvites.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('pendingInvitations')}</Text>
                        {pendingInvites.map((inv) => (
                            <View key={inv.token} style={styles.inviteCard}>
                                <View style={styles.inviteInfo}>
                                    <Text style={styles.inviteHousehold}>{inv.householdName}</Text>
                                    <Text style={styles.inviteFrom}>{t('invitedBy')}: {inv.inviterName}</Text>
                                </View>
                                <View style={styles.inviteActions}>
                                    <TouchableOpacity
                                        style={[styles.inviteBtn, { backgroundColor: colors.primary }]}
                                        onPress={() => handleAcceptInvite(inv.token)}
                                    >
                                        <Text style={styles.inviteBtnText}>{t('acceptInvitation')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.inviteBtn, { backgroundColor: colors.error || '#e53e3e' }]}
                                        onPress={() => handleDeclineInvite(inv.token)}
                                    >
                                        <Text style={styles.inviteBtnText}>{t('declineInvitation')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {household ? (
                    <>
                        {/* Members */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('members')}</Text>
                            {household.members.map((member) => (
                                <View key={member.userId} style={styles.memberRow}>
                                    <View style={styles.memberAvatar}>
                                        <Text style={styles.memberAvatarText}>
                                            {member.name.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={styles.memberInfo}>
                                        <Text style={styles.memberName}>{member.name}</Text>
                                        {member.username && (
                                            <Text style={styles.memberUsername}>@{member.username}</Text>
                                        )}
                                    </View>
                                    <View style={[styles.roleBadge, member.role === 'OWNER' && styles.roleBadgeOwner]}>
                                        <Text style={styles.roleBadgeText}>
                                            {member.role === 'OWNER' ? t('owner') : t('member')}
                                        </Text>
                                    </View>
                                    {isOwner && member.userId !== household.members.find(m => m.role === 'OWNER')?.userId
                                        && member.role !== 'OWNER' && (
                                        <TouchableOpacity
                                            onPress={() => handleRemoveMember(member)}
                                            style={styles.removeButton}
                                        >
                                            <Ionicons name="person-remove-outline" size={18} color={colors.error || '#e53e3e'} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                        </View>

                        {/* Invite Member (OWNER only) */}
                        {isOwner && (
                            <View style={styles.section}>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => setShowInviteModal(true)}
                                >
                                    <Ionicons name="person-add-outline" size={18} color={colors.textWhite} style={{ marginRight: spacing.sm }} />
                                    <Text style={styles.actionButtonText}>{t('inviteMember')}</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Leave Household (MEMBER only) */}
                        {!isOwner && (
                            <View style={[styles.section, { marginTop: spacing.xxl }]}>
                                <TouchableOpacity style={styles.dangerButton} onPress={handleLeave}>
                                    <Ionicons name="exit-outline" size={18} color={colors.textWhite} style={{ marginRight: spacing.sm }} />
                                    <Text style={styles.dangerButtonText}>{t('leaveHousehold')}</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                ) : (
                    <View style={styles.noHousehold}>
                        <Ionicons name="home-outline" size={64} color={colors.textLight} />
                        <Text style={styles.noHouseholdText}>{t('noHousehold')}</Text>
                        <Text style={styles.noHouseholdSubtext}>{t('createOrJoin')}</Text>
                        <TouchableOpacity
                            style={styles.createButton}
                            onPress={() => {
                                setRenameInput('');
                                setShowRenameModal(true);
                            }}
                        >
                            <Ionicons name="add-circle-outline" size={18} color={colors.textWhite} style={{ marginRight: spacing.sm }} />
                            <Text style={styles.actionButtonText}>{t('createHousehold')}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={{ height: 80 }} />
            </ScrollView>

            {/* Invite Modal */}
            <Modal visible={showInviteModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback onPress={() => setShowInviteModal(false)}>
                        <View style={styles.overlayTouchArea} />
                    </TouchableWithoutFeedback>
                    <View style={styles.modal}>
                        <View style={styles.handleBar} />
                        <Text style={styles.modalTitle}>{t('inviteMember')}</Text>
                        <Text style={styles.modalHint}>{t('inviteByEmailOrUsername')}</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="mail-outline" size={18} color={colors.textLight} style={{ marginRight: spacing.sm }} />
                            <TextInput
                                style={styles.modalInput}
                                placeholder="email@example.com or @username"
                                placeholderTextColor={colors.textLight}
                                value={inviteInput}
                                onChangeText={setInviteInput}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                        <TouchableOpacity
                            style={[styles.actionButton, submitting && { opacity: 0.6 }]}
                            onPress={handleInvite}
                            disabled={submitting}
                        >
                            {submitting ? <ActivityIndicator color={colors.textWhite} /> : (
                                <Text style={styles.actionButtonText}>{t('inviteMember')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Rename Modal */}
            <Modal visible={showRenameModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback onPress={() => setShowRenameModal(false)}>
                        <View style={styles.overlayTouchArea} />
                    </TouchableWithoutFeedback>
                    <View style={styles.modal}>
                        <View style={styles.handleBar} />
                        <Text style={styles.modalTitle}>{household ? t('renameHousehold') : t('createHousehold')}</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="home-outline" size={18} color={colors.textLight} style={{ marginRight: spacing.sm }} />
                            <TextInput
                                style={styles.modalInput}
                                placeholder={t('householdName')}
                                placeholderTextColor={colors.textLight}
                                value={renameInput}
                                onChangeText={setRenameInput}
                            />
                        </View>
                        <TouchableOpacity
                            style={[styles.actionButton, submitting && { opacity: 0.6 }]}
                            onPress={handleRename}
                            disabled={submitting}
                        >
                            {submitting ? <ActivityIndicator color={colors.textWhite} /> : (
                                <Text style={styles.actionButtonText}>{t('save')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { justifyContent: 'center', alignItems: 'center' },
    header: {
        paddingTop: 60,
        paddingBottom: spacing.xl,
        paddingHorizontal: spacing.xl,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    headerTitle: {
        fontSize: fontSize.xl,
        fontFamily: fontFamily.bold,
        color: colors.textWhite,
    },
    closeButton: {
        padding: spacing.sm,
        borderRadius: borderRadius.full,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    content: { flex: 1 },
    section: {
        marginHorizontal: spacing.xl,
        marginTop: spacing.xl,
    },
    sectionTitle: {
        fontSize: fontSize.base,
        fontFamily: fontFamily.semibold,
        color: colors.textLight,
        marginBottom: spacing.md,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.sm,
        ...shadows.small,
    },
    memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.full,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    memberAvatarText: {
        fontSize: fontSize.lg,
        fontFamily: fontFamily.bold,
        color: colors.textWhite,
    },
    memberInfo: { flex: 1 },
    memberName: {
        fontSize: fontSize.base,
        fontFamily: fontFamily.semibold,
        color: colors.text,
    },
    memberUsername: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.regular,
        color: colors.textLight,
    },
    roleBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
        backgroundColor: colors.border,
        marginRight: spacing.sm,
    },
    roleBadgeOwner: { backgroundColor: colors.primary },
    roleBadgeText: {
        fontSize: fontSize.xs,
        fontFamily: fontFamily.semibold,
        color: colors.textWhite,
    },
    removeButton: { padding: spacing.sm },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.lg,
        ...shadows.small,
    },
    actionButtonText: {
        fontSize: fontSize.base,
        fontFamily: fontFamily.bold,
        color: colors.textWhite,
    },
    dangerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.error || '#e53e3e',
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.lg,
        ...shadows.small,
    },
    dangerButtonText: {
        fontSize: fontSize.base,
        fontFamily: fontFamily.bold,
        color: colors.textWhite,
    },
    inviteCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.sm,
        ...shadows.small,
    },
    inviteInfo: { marginBottom: spacing.md },
    inviteHousehold: {
        fontSize: fontSize.base,
        fontFamily: fontFamily.semibold,
        color: colors.text,
    },
    inviteFrom: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.regular,
        color: colors.textLight,
    },
    inviteActions: { flexDirection: 'row', gap: spacing.sm },
    inviteBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    inviteBtnText: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.semibold,
        color: colors.textWhite,
    },
    noHousehold: {
        alignItems: 'center',
        marginTop: spacing.xxl * 2,
        paddingHorizontal: spacing.xl,
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xxl,
        marginTop: spacing.xl,
        ...shadows.small,
    },
    noHouseholdText: {
        fontSize: fontSize.xl,
        fontFamily: fontFamily.semibold,
        color: colors.text,
        marginTop: spacing.xl,
    },
    noHouseholdSubtext: {
        fontSize: fontSize.base,
        fontFamily: fontFamily.regular,
        color: colors.textLight,
        marginTop: spacing.sm,
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    overlayTouchArea: { flex: 1 },
    modal: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: borderRadius.xxl,
        borderTopRightRadius: borderRadius.xxl,
        padding: spacing.xl,
        paddingBottom: spacing.xxl + spacing.xl,
    },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: colors.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: spacing.xl,
    },
    modalTitle: {
        fontSize: fontSize.xl,
        fontFamily: fontFamily.bold,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    modalHint: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.regular,
        color: colors.textLight,
        marginBottom: spacing.lg,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        ...shadows.small,
    },
    modalInput: {
        flex: 1,
        paddingVertical: spacing.lg,
        fontSize: fontSize.base,
        fontFamily: fontFamily.regular,
        color: colors.text,
    },
});
