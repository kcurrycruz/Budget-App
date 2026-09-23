import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radius, spacing } from '../theme';
import type { SavingsGoal, SavingsGoalContribution, SavingsGoalContributionDraft, SavingsGoalDraft } from '../types';
import { formatTargetMonth, savingsGoalMonthlyAmount, toDateOnly } from '../utils/date';
import { formatMoney, formatMoneyInput, parseMoneyInput } from '../utils/money';

type SavingsGoalModalProps = {
  contributionSaving: boolean;
  initialGoal?: SavingsGoal | null;
  onAddContribution?: (draft: SavingsGoalContributionDraft) => Promise<boolean>;
  onClose: () => void;
  onDelete?: () => void;
  onDeleteContribution?: (contribution: SavingsGoalContribution) => void;
  onSave: (draft: SavingsGoalDraft) => void;
  saving: boolean;
  visible: boolean;
};

const monthStart = (offset: number) => {
  const now = new Date();
  return toDateOnly(new Date(now.getFullYear(), now.getMonth() + offset, 1));
};

const formatContributionDate = (date: string) => new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
}).format(new Date(`${date}T12:00:00`));

export function SavingsGoalModal({
  contributionSaving,
  initialGoal,
  onAddContribution,
  onClose,
  onDelete,
  onDeleteContribution,
  onSave,
  saving,
  visible,
}: SavingsGoalModalProps) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [startingAmount, setStartingAmount] = useState('');
  const [targetMonth, setTargetMonth] = useState(monthStart(12));
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionNote, setContributionNote] = useState('');
  const monthOptions = useMemo(() => {
    const options = Array.from({ length: 18 }, (_, index) => monthStart(index + 1));
    return initialGoal && !options.includes(initialGoal.targetMonth)
      ? [initialGoal.targetMonth, ...options]
      : options;
  }, [initialGoal]);

  useEffect(() => {
    if (visible && initialGoal) {
      setName(initialGoal.name);
      setTargetAmount(formatMoneyInput(String(initialGoal.targetAmount)));
      setStartingAmount(formatMoneyInput(String(initialGoal.startingAmount)));
      setTargetMonth(initialGoal.targetMonth);
    } else if (!visible) {
      setName('');
      setTargetAmount('');
      setStartingAmount('');
      setTargetMonth(monthStart(12));
      setContributionAmount('');
      setContributionNote('');
    }
  }, [initialGoal, visible]);

  const numericTarget = parseMoneyInput(targetAmount);
  const numericStarting = parseMoneyInput(startingAmount);
  const existingContributions = initialGoal?.contributions.reduce((sum, contribution) => sum + contribution.amount, 0) ?? 0;
  const displayedSaved = numericStarting + existingContributions;
  const numericContribution = parseMoneyInput(contributionAmount);
  const canSave = !saving && name.trim().length > 0 && numericTarget > 0 && numericStarting >= 0;
  const canAddContribution = Boolean(onAddContribution) && !contributionSaving && numericContribution > 0;
  const monthlyAmount = savingsGoalMonthlyAmount(numericTarget, displayedSaved, targetMonth);
  const complete = numericTarget > 0 && displayedSaved >= numericTarget;

  const save = () => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      targetAmount: numericTarget,
      startingAmount: numericStarting,
      targetMonth,
    });
  };

  const addContribution = async () => {
    if (!canAddContribution || !onAddContribution) return;
    const saved = await onAddContribution({
      amount: numericContribution,
      note: contributionNote.trim(),
      contributedOn: toDateOnly(new Date()),
    });
    if (saved) {
      setContributionAmount('');
      setContributionNote('');
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={visible}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable accessibilityLabel="Close savings goal" disabled={saving} onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons color={colors.ink} name="close" size={22} />
            </Pressable>
            <Text style={styles.title}>{initialGoal ? 'Edit savings goal' : 'Create a savings goal'}</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Goal name</Text>
            <TextInput
              autoCapitalize="words"
              autoFocus
              maxLength={80}
              onChangeText={setName}
              placeholder="Emergency fund, house deposit…"
              placeholderTextColor={colors.inkMuted}
              style={styles.textInput}
              value={name}
            />
          </View>

          <View style={styles.moneyGrid}>
            <View style={styles.moneyField}>
              <Text style={styles.fieldLabel}>Goal amount</Text>
              <View style={styles.moneyInputShell}>
                <Text style={styles.currency}>$</Text>
                <TextInput
                  accessibilityLabel="Savings goal amount"
                  keyboardType="decimal-pad"
                  onChangeText={(value) => setTargetAmount(formatMoneyInput(value))}
                  placeholder="0"
                  placeholderTextColor="#A7B0AA"
                  style={styles.moneyInput}
                  value={targetAmount}
                />
              </View>
            </View>
            <View style={styles.moneyField}>
              <Text style={styles.fieldLabel}>Starting balance</Text>
              <View style={styles.moneyInputShell}>
                <Text style={styles.currency}>$</Text>
                <TextInput
                  accessibilityLabel="Starting savings balance"
                  keyboardType="decimal-pad"
                  onChangeText={(value) => setStartingAmount(formatMoneyInput(value))}
                  placeholder="0"
                  placeholderTextColor="#A7B0AA"
                  style={styles.moneyInput}
                  value={startingAmount}
                />
              </View>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Target month</Text>
            <View style={styles.months}>
              {monthOptions.map((month) => {
                const selected = targetMonth === month;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    key={month}
                    onPress={() => setTargetMonth(month)}
                    style={[styles.month, selected && styles.monthSelected]}
                  >
                    <Text style={[styles.monthText, selected && styles.monthTextSelected]}>{formatTargetMonth(month)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {numericTarget > 0 ? (
            <View style={styles.infoCard}>
              <MaterialCommunityIcons color={complete ? '#2F7A4D' : colors.primary} name={complete ? 'check-circle-outline' : 'target'} size={22} />
              <Text style={styles.infoText}>
                {complete
                  ? 'You reached this goal. Great work — you can keep the final balance here or start a new goal.'
                  : <>Save about <Text style={styles.infoStrong}>{formatMoney(monthlyAmount)} per month</Text> to reach this goal by {formatTargetMonth(targetMonth, true)}.</>}
              </Text>
            </View>
          ) : null}

          <Pressable disabled={!canSave} onPress={save} style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}>
            <Text style={styles.saveButtonText}>{saving ? 'Saving…' : initialGoal ? 'Save changes' : 'Create goal'}</Text>
          </Pressable>

          {initialGoal && onAddContribution ? (
            <View style={styles.contributionSection}>
              <View style={styles.contributionHeading}>
                <View>
                  <Text style={styles.contributionTitle}>Contribution history</Text>
                  <Text style={styles.contributionCaption}>{formatMoney(initialGoal.currentAmount)} saved in total</Text>
                </View>
                <View style={styles.contributionCount}>
                  <Text style={styles.contributionCountText}>{initialGoal.contributions.length}</Text>
                </View>
              </View>

              <View style={styles.contributionCard}>
                <Text style={styles.fieldLabel}>Add money saved today</Text>
                <View style={styles.moneyInputShell}>
                  <Text style={styles.currency}>$</Text>
                  <TextInput
                    accessibilityLabel="Savings contribution amount"
                    keyboardType="decimal-pad"
                    onChangeText={(value) => setContributionAmount(formatMoneyInput(value))}
                    placeholder="0"
                    placeholderTextColor="#A7B0AA"
                    style={styles.moneyInput}
                    value={contributionAmount}
                  />
                </View>
                <TextInput
                  accessibilityLabel="Savings contribution note"
                  maxLength={160}
                  onChangeText={setContributionNote}
                  placeholder="Optional note"
                  placeholderTextColor={colors.inkMuted}
                  style={styles.textInput}
                  value={contributionNote}
                />
                <Pressable
                  disabled={!canAddContribution}
                  onPress={() => { void addContribution(); }}
                  style={[styles.contributionButton, !canAddContribution && styles.saveButtonDisabled]}
                >
                  <MaterialCommunityIcons color={colors.white} name="plus" size={18} />
                  <Text style={styles.contributionButtonText}>{contributionSaving ? 'Adding…' : 'Add contribution'}</Text>
                </Pressable>
              </View>

              {initialGoal.contributions.length ? (
                <View style={styles.historyList}>
                  {initialGoal.contributions.slice(0, 6).map((contribution, index) => (
                    <View key={contribution.id}>
                      <View style={styles.historyRow}>
                        <View style={styles.historyIcon}>
                          <MaterialCommunityIcons color="#2F7A4D" name="arrow-up" size={18} />
                        </View>
                        <View style={styles.historyCopy}>
                          <Text style={styles.historyAmount}>+{formatMoney(contribution.amount)}</Text>
                          <Text numberOfLines={1} style={styles.historyDetail}>
                            {contribution.note ? `${contribution.note} · ` : ''}{formatContributionDate(contribution.contributedOn)}
                          </Text>
                        </View>
                        {onDeleteContribution ? (
                          <Pressable
                            accessibilityLabel={`Delete ${formatMoney(contribution.amount)} contribution`}
                            disabled={contributionSaving}
                            onPress={() => onDeleteContribution(contribution)}
                            style={styles.historyDelete}
                          >
                            <MaterialCommunityIcons color={colors.inkMuted} name="trash-can-outline" size={18} />
                          </Pressable>
                        ) : null}
                      </View>
                      {index < Math.min(initialGoal.contributions.length, 6) - 1 ? <View style={styles.historyDivider} /> : null}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyHistory}>
                  <MaterialCommunityIcons color={colors.primary} name="piggy-bank-outline" size={22} />
                  <Text style={styles.emptyHistoryText}>Your deposits will appear here as you build this goal.</Text>
                </View>
              )}
            </View>
          ) : null}

          {initialGoal && onDelete ? (
            <Pressable disabled={saving} onPress={onDelete} style={styles.deleteButton}>
              <Text style={styles.deleteText}>Delete savings goal</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: { backgroundColor: colors.background, flex: 1 },
  content: { gap: spacing.xl, padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  closeButton: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, height: 40, justifyContent: 'center', width: 40 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  headerSpacer: { width: 40 },
  fieldGroup: { gap: spacing.sm },
  fieldLabel: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  textInput: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.ink, fontSize: 16, height: 54, paddingHorizontal: spacing.lg },
  moneyGrid: { flexDirection: 'row', gap: spacing.md },
  moneyField: { flex: 1, gap: spacing.sm },
  moneyInputShell: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', height: 58, paddingHorizontal: spacing.md },
  currency: { color: colors.inkMuted, fontSize: 18, fontWeight: '800', marginRight: spacing.xs },
  moneyInput: { color: colors.ink, flex: 1, fontSize: 19, fontWeight: '800', padding: 0, textAlign: 'left' },
  months: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  month: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  monthSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  monthText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  monthTextSelected: { color: colors.white },
  infoCard: { alignItems: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  infoText: { color: colors.primaryDark, flex: 1, fontSize: 12, lineHeight: 18 },
  infoStrong: { fontWeight: '800' },
  saveButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.lg },
  saveButtonDisabled: { opacity: 0.35 },
  saveButtonText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  deleteButton: { alignItems: 'center', padding: spacing.md },
  deleteText: { color: colors.danger, fontSize: 13, fontWeight: '800' },
  contributionSection: { gap: spacing.lg },
  contributionHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  contributionTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  contributionCaption: { color: colors.inkMuted, fontSize: 11, marginTop: 3 },
  contributionCount: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.pill, height: 30, justifyContent: 'center', minWidth: 30, paddingHorizontal: spacing.sm },
  contributionCountText: { color: colors.primaryDark, fontSize: 12, fontWeight: '800' },
  contributionCard: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, gap: spacing.md, padding: spacing.lg },
  contributionButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', padding: spacing.md },
  contributionButtonText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  historyList: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.lg },
  historyRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 64, paddingVertical: spacing.md },
  historyIcon: { alignItems: 'center', backgroundColor: '#E7F5EC', borderRadius: radius.pill, height: 34, justifyContent: 'center', width: 34 },
  historyCopy: { flex: 1, gap: 2 },
  historyAmount: { color: '#2F7A4D', fontSize: 14, fontWeight: '800' },
  historyDetail: { color: colors.inkMuted, fontSize: 10 },
  historyDelete: { alignItems: 'center', height: 38, justifyContent: 'center', width: 38 },
  historyDivider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth, marginLeft: 46 },
  emptyHistory: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderStyle: 'dashed', borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  emptyHistoryText: { color: colors.inkMuted, flex: 1, fontSize: 11, lineHeight: 16 },
});
