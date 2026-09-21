import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useState } from 'react';
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
import type { Category, RecurringBill, RecurringBillDraft } from '../types';
import { formatMoneyInput, parseMoneyInput } from '../utils/money';

type RecurringBillModalProps = {
  categories: Category[];
  initialBill?: RecurringBill | null;
  onClose: () => void;
  onDelete?: () => void;
  onSave: (draft: RecurringBillDraft) => void;
  saving: boolean;
  visible: boolean;
};

export function RecurringBillModal({
  categories,
  initialBill,
  onClose,
  onDelete,
  onSave,
  saving,
  visible,
}: RecurringBillModalProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('1');
  const [categoryId, setCategoryId] = useState('');

  useEffect(() => {
    if (visible && initialBill) {
      setName(initialBill.name);
      setAmount(formatMoneyInput(String(initialBill.amount)));
      setDueDay(String(initialBill.dueDay));
      setCategoryId(initialBill.categoryId ?? '');
    } else if (!visible) {
      setName('');
      setAmount('');
      setDueDay('1');
      setCategoryId('');
    }
  }, [initialBill, visible]);

  const numericAmount = parseMoneyInput(amount);
  const numericDueDay = Number(dueDay);
  const canSave = !saving
    && name.trim().length > 0
    && numericAmount > 0
    && Number.isInteger(numericDueDay)
    && numericDueDay >= 1
    && numericDueDay <= 31;

  const save = () => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      amount: numericAmount,
      dueDay: numericDueDay,
      categoryId: categoryId || undefined,
    });
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={visible}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable accessibilityLabel="Close bill entry" disabled={saving} onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons color={colors.ink} name="close" size={22} />
            </Pressable>
            <Text style={styles.title}>{initialBill ? 'Edit recurring bill' : 'Add recurring bill'}</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.amountBlock}>
            <Text style={styles.amountLabel}>Monthly amount</Text>
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
            <Text style={styles.fieldLabel}>Bill or subscription</Text>
            <TextInput
              autoCapitalize="words"
              maxLength={80}
              onChangeText={setName}
              placeholder="Rent, internet, streaming…"
              placeholderTextColor={colors.inkMuted}
              style={styles.textInput}
              value={name}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Due day each month</Text>
            <View style={styles.dueRow}>
              <Text style={styles.duePrefix}>Day</Text>
              <TextInput
                keyboardType="number-pad"
                maxLength={2}
                onChangeText={(value) => setDueDay(value.replace(/\D/g, ''))}
                placeholder="1"
                placeholderTextColor={colors.inkMuted}
                style={styles.dueInput}
                value={dueDay}
              />
              <Text style={styles.dueHint}>Use 31 for the last day in shorter months.</Text>
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
                <MaterialCommunityIcons color={categoryId === '' ? colors.white : colors.inkMuted} name="wallet-outline" size={18} />
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
                    <MaterialCommunityIcons
                      color={selected ? colors.white : category.color}
                      name={category.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                      size={18}
                    />
                    <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>{category.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.infoCard}>
            <MaterialCommunityIcons color={colors.primary} name="information-outline" size={21} />
            <Text style={styles.infoText}>Adding details here does not change your fixed-cost plan total. It helps you see what is due and what is paid.</Text>
          </View>

          <Pressable disabled={!canSave} onPress={save} style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}>
            <Text style={styles.saveButtonText}>{saving ? 'Saving…' : initialBill ? 'Save changes' : 'Add recurring bill'}</Text>
          </Pressable>

          {initialBill && onDelete ? (
            <Pressable disabled={saving} onPress={onDelete} style={styles.deleteButton}>
              <Text style={styles.deleteText}>Delete recurring bill</Text>
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
  dueRow: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', minHeight: 58, paddingHorizontal: spacing.lg },
  duePrefix: { color: colors.inkMuted, fontSize: 14, fontWeight: '700' },
  dueInput: { color: colors.ink, fontSize: 22, fontWeight: '800', marginHorizontal: spacing.sm, paddingHorizontal: spacing.sm, textAlign: 'center', width: 54 },
  dueHint: { color: colors.inkMuted, flex: 1, fontSize: 11, lineHeight: 15 },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  category: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 9 },
  categorySelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  categoryTextSelected: { color: colors.white },
  infoCard: { alignItems: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  infoText: { color: colors.primaryDark, flex: 1, fontSize: 12, lineHeight: 18 },
  saveButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.lg },
  saveButtonDisabled: { opacity: 0.35 },
  saveButtonText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  deleteButton: { alignItems: 'center', padding: spacing.md },
  deleteText: { color: colors.danger, fontSize: 13, fontWeight: '800' },
});
