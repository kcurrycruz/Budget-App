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
import type { SavingsGoal, SavingsGoalDraft } from '../types';
import { formatTargetMonth, savingsGoalMonthlyAmount, toDateOnly } from '../utils/date';
import { formatMoney, formatMoneyInput, parseMoneyInput } from '../utils/money';

type SavingsGoalModalProps = {
  initialGoal?: SavingsGoal | null;
  onClose: () => void;
  onDelete?: () => void;
  onSave: (draft: SavingsGoalDraft) => void;
  saving: boolean;
  visible: boolean;
};

const monthStart = (offset: number) => {
  const now = new Date();
  return toDateOnly(new Date(now.getFullYear(), now.getMonth() + offset, 1));
};

export function SavingsGoalModal({ initialGoal, onClose, onDelete, onSave, saving, visible }: SavingsGoalModalProps) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetMonth, setTargetMonth] = useState(monthStart(12));
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
      setCurrentAmount(formatMoneyInput(String(initialGoal.currentAmount)));
      setTargetMonth(initialGoal.targetMonth);
    } else if (!visible) {
      setName('');
      setTargetAmount('');
      setCurrentAmount('');
      setTargetMonth(monthStart(12));
    }
  }, [initialGoal, visible]);

  const numericTarget = parseMoneyInput(targetAmount);
  const numericCurrent = parseMoneyInput(currentAmount);
  const canSave = !saving && name.trim().length > 0 && numericTarget > 0 && numericCurrent >= 0;
  const monthlyAmount = savingsGoalMonthlyAmount(numericTarget, numericCurrent, targetMonth);
  const complete = numericTarget > 0 && numericCurrent >= numericTarget;

  const save = () => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      targetAmount: numericTarget,
      currentAmount: numericCurrent,
      targetMonth,
    });
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
              <Text style={styles.fieldLabel}>Saved so far</Text>
              <View style={styles.moneyInputShell}>
                <Text style={styles.currency}>$</Text>
                <TextInput
                  accessibilityLabel="Amount saved so far"
                  keyboardType="decimal-pad"
                  onChangeText={(value) => setCurrentAmount(formatMoneyInput(value))}
                  placeholder="0"
                  placeholderTextColor="#A7B0AA"
                  style={styles.moneyInput}
                  value={currentAmount}
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
});
