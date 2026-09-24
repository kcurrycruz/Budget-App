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
import type { Category, PlannedExpense, PlannedExpenseDraft } from '../types';
import { formatTargetMonth, plannedExpenseMonthlyAmount, toDateOnly } from '../utils/date';
import { formatMoney, formatMoneyInput, parseMoneyInput } from '../utils/money';

type PlannedExpenseModalProps = {
  categories: Category[];
  initialExpense?: PlannedExpense | null;
  onClose: () => void;
  onDelete?: () => void;
  onSave: (draft: PlannedExpenseDraft) => void;
  saving: boolean;
  visible: boolean;
};

const monthStart = (offset: number) => {
  const now = new Date();
  return toDateOnly(new Date(now.getFullYear(), now.getMonth() + offset, 1));
};

export function PlannedExpenseModal({
  categories,
  initialExpense,
  onClose,
  onDelete,
  onSave,
  saving,
  visible,
}: PlannedExpenseModalProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [targetMonth, setTargetMonth] = useState(monthStart(1));
  const [categoryId, setCategoryId] = useState('');
  const [autoFund, setAutoFund] = useState(false);
  const monthOptions = useMemo(() => {
    const options = Array.from({ length: 12 }, (_, index) => monthStart(index));
    return initialExpense && !options.includes(initialExpense.targetMonth)
      ? [initialExpense.targetMonth, ...options]
      : options;
  }, [initialExpense]);

  useEffect(() => {
    if (visible && initialExpense) {
      setName(initialExpense.name);
      setAmount(formatMoneyInput(String(initialExpense.amount)));
      setTargetMonth(initialExpense.targetMonth);
      setCategoryId(initialExpense.categoryId ?? '');
      setAutoFund(initialExpense.autoFund);
    } else if (!visible) {
      setName('');
      setAmount('');
      setTargetMonth(monthStart(1));
      setCategoryId('');
      setAutoFund(false);
    }
  }, [initialExpense, visible]);

  const numericAmount = parseMoneyInput(amount);
  const canSave = !saving && name.trim().length > 0 && numericAmount > 0;
  const monthlyAmount = plannedExpenseMonthlyAmount(numericAmount, targetMonth);

  const save = () => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      amount: numericAmount,
      targetMonth,
      categoryId: categoryId || undefined,
      autoFund,
    });
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={visible}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable accessibilityLabel="Close planned expense" disabled={saving} onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons color={colors.ink} name="close" size={22} />
            </Pressable>
            <Text style={styles.title}>{initialExpense ? 'Edit planned expense' : 'Plan an expense'}</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.amountBlock}>
            <Text style={styles.amountLabel}>Total amount</Text>
            <View style={styles.amountLine}>
              <Text style={styles.currency}>$</Text>
              <TextInput
                autoFocus
                keyboardType="decimal-pad"
                onChangeText={(value) => setAmount(formatMoneyInput(value))}
                placeholder="0.00"
                placeholderTextColor="#A7B0AA"
                style={styles.amountInput}
                value={amount}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>What are you planning for?</Text>
            <TextInput
              autoCapitalize="words"
              maxLength={80}
              onChangeText={setName}
              placeholder="Trip, car repair, holiday gifts…"
              placeholderTextColor={colors.inkMuted}
              style={styles.textInput}
              value={name}
            />
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

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Category <Text style={styles.optional}>(optional)</Text></Text>
            <View style={styles.categories}>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: categoryId === '' }}
                onPress={() => setCategoryId('')}
                style={[styles.category, categoryId === '' && styles.categorySelected]}
              >
                <MaterialCommunityIcons color={categoryId === '' ? colors.white : colors.inkMuted} name="calendar-star" size={18} />
                <Text style={[styles.categoryText, categoryId === '' && styles.categoryTextSelected]}>No category</Text>
              </Pressable>
              {categories.map((category) => {
                const selected = category.id === categoryId;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    key={category.id}
                    onPress={() => setCategoryId(category.id)}
                    style={[styles.category, selected && styles.categorySelected]}
                  >
                    <MaterialCommunityIcons color={selected ? colors.white : category.color} name={category.icon as keyof typeof MaterialCommunityIcons.glyphMap} size={18} />
                    <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>{category.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: autoFund }}
            onPress={() => setAutoFund((current) => !current)}
            style={styles.automationCard}
          >
            <View style={styles.automationIcon}>
              <MaterialCommunityIcons color={colors.primaryDark} name="calendar-sync-outline" size={22} />
            </View>
            <View style={styles.automationCopy}>
              <Text style={styles.automationTitle}>Monthly auto set-aside</Text>
              <Text style={styles.automationText}>Record one suggested contribution each month. This never moves money.</Text>
            </View>
            <View style={[styles.switchTrack, autoFund && styles.switchTrackOn]}>
              <View style={[styles.switchThumb, autoFund && styles.switchThumbOn]} />
            </View>
          </Pressable>

          {initialExpense && initialExpense.savedAmount > 0 ? (
            <View style={styles.progressCard}>
              <View style={styles.progressTop}>
                <Text style={styles.progressLabel}>Tracked in this fund</Text>
                <Text style={styles.progressValue}>{formatMoney(initialExpense.savedAmount)} of {formatMoney(initialExpense.amount)}</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.min(100, (initialExpense.savedAmount / initialExpense.amount) * 100)}%` }]} />
              </View>
            </View>
          ) : null}

          {numericAmount > 0 ? (
            <View style={styles.infoCard}>
              <MaterialCommunityIcons color={colors.primary} name="calendar-clock-outline" size={22} />
              <Text style={styles.infoText}>
                {autoFund ? 'Zenify will record ' : 'Plan to reserve about '}
                <Text style={styles.infoStrong}>{formatMoney(monthlyAmount)} per month</Text> through {formatTargetMonth(targetMonth, true)}.
                {autoFund ? ' The amount automatically adjusts as the target gets closer.' : ' Mark it covered when the money is ready or the expense is paid.'}
              </Text>
            </View>
          ) : null}

          <Pressable disabled={!canSave} onPress={save} style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}>
            <Text style={styles.saveButtonText}>{saving ? 'Saving…' : initialExpense ? 'Save changes' : 'Add to plan'}</Text>
          </Pressable>

          {initialExpense && onDelete ? (
            <Pressable disabled={saving} onPress={onDelete} style={styles.deleteButton}>
              <Text style={styles.deleteText}>Delete planned expense</Text>
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
  amountBlock: { alignItems: 'center', paddingVertical: spacing.xl },
  amountLabel: { color: colors.inkMuted, fontSize: 12, fontWeight: '700' },
  amountLine: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: spacing.sm },
  currency: { color: colors.ink, fontSize: 34, fontWeight: '700', marginRight: spacing.xs },
  amountInput: { color: colors.ink, fontSize: 48, fontWeight: '800', padding: 0, textAlign: 'left', width: 230 },
  fieldGroup: { gap: spacing.sm },
  fieldLabel: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  optional: { color: colors.inkMuted, fontWeight: '500' },
  textInput: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.ink, fontSize: 16, height: 54, paddingHorizontal: spacing.lg },
  months: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  month: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  monthSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  monthText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  monthTextSelected: { color: colors.white },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  category: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 9 },
  categorySelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  categoryTextSelected: { color: colors.white },
  automationCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  automationIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.sm, height: 42, justifyContent: 'center', width: 42 },
  automationCopy: { flex: 1, gap: 3 },
  automationTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  automationText: { color: colors.inkMuted, fontSize: 11, lineHeight: 16 },
  switchTrack: { backgroundColor: colors.border, borderRadius: radius.pill, height: 26, justifyContent: 'center', paddingHorizontal: 3, width: 46 },
  switchTrackOn: { backgroundColor: colors.primary },
  switchThumb: { backgroundColor: colors.white, borderRadius: radius.pill, height: 20, width: 20 },
  switchThumbOn: { alignSelf: 'flex-end' },
  progressCard: { backgroundColor: colors.surface, borderRadius: radius.md, gap: spacing.sm, padding: spacing.lg },
  progressTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { color: colors.inkMuted, fontSize: 11, fontWeight: '700' },
  progressValue: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  progressTrack: { backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, height: 7, overflow: 'hidden' },
  progressFill: { backgroundColor: colors.primary, borderRadius: radius.pill, height: '100%' },
  infoCard: { alignItems: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  infoText: { color: colors.primaryDark, flex: 1, fontSize: 12, lineHeight: 18 },
  infoStrong: { fontWeight: '800' },
  saveButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.lg },
  saveButtonDisabled: { opacity: 0.35 },
  saveButtonText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  deleteButton: { alignItems: 'center', padding: spacing.md },
  deleteText: { color: colors.danger, fontSize: 13, fontWeight: '800' },
});
