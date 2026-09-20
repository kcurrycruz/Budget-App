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
import type { Category, ManualTransactionDraft } from '../types';
import { toDateOnly } from '../utils/date';
import { formatMoneyInput, parseMoneyInput } from '../utils/money';

type AddTransactionModalProps = {
  categories: Category[];
  visible: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (draft: ManualTransactionDraft) => void;
};

export function AddTransactionModal({ categories, visible, saving, onClose, onSave }: AddTransactionModalProps) {
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? 'other');
  const [direction, setDirection] = useState<'outflow' | 'inflow'>('outflow');
  const [dateChoice, setDateChoice] = useState<'today' | 'yesterday'>('today');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!visible) {
      setMerchant('');
      setAmount('');
      setCategoryId(categories[0]?.id ?? 'other');
      setDirection('outflow');
      setDateChoice('today');
      setNote('');
    }
  }, [categories, visible]);

  const numericAmount = parseMoneyInput(amount);
  const canSave = !saving && merchant.trim().length > 0 && Number.isFinite(numericAmount) && numericAmount > 0;

  const save = () => {
    if (!canSave) return;
    const transactionDate = new Date();
    if (dateChoice === 'yesterday') transactionDate.setDate(transactionDate.getDate() - 1);
    onSave({
      merchant: merchant.trim(),
      amount: numericAmount,
      categoryId: direction === 'outflow' ? categoryId : '',
      direction,
      note: note.trim(),
      transactionDate: toDateOnly(transactionDate),
    });
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={visible}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable accessibilityLabel="Close transaction entry" disabled={saving} onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons color={colors.ink} name="close" size={22} />
            </Pressable>
            <Text style={styles.title}>Add transaction</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.typePicker}>
            {([
              { value: 'outflow' as const, label: 'Expense', icon: 'arrow-up-right' as const },
              { value: 'inflow' as const, label: 'Income', icon: 'arrow-down-left' as const },
            ]).map((option) => {
              const selected = direction === option.value;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  key={option.value}
                  onPress={() => setDirection(option.value)}
                  style={[styles.typeOption, selected && styles.typeOptionSelected]}
                >
                  <MaterialCommunityIcons color={selected ? colors.white : colors.inkMuted} name={option.icon} size={19} />
                  <Text style={[styles.typeText, selected && styles.typeTextSelected]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.amountBlock}>
            <Text style={styles.amountLabel}>Amount</Text>
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
            <Text style={styles.fieldLabel}>{direction === 'outflow' ? 'Where did you spend?' : 'Where did it come from?'}</Text>
            <TextInput
              autoCapitalize="words"
              onChangeText={setMerchant}
              placeholder={direction === 'outflow' ? 'Merchant or description' : 'Employer or income source'}
              placeholderTextColor={colors.inkMuted}
              style={styles.textInput}
              value={merchant}
            />
          </View>

          {direction === 'outflow' ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.categories}>
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
          ) : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Date</Text>
            <View style={styles.dateChoices}>
              {(['today', 'yesterday'] as const).map((choice) => {
                const selected = dateChoice === choice;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    key={choice}
                    onPress={() => setDateChoice(choice)}
                    style={[styles.dateChoice, selected && styles.dateChoiceSelected]}
                  >
                    <Text style={[styles.dateChoiceText, selected && styles.dateChoiceTextSelected]}>
                      {choice === 'today' ? 'Today' : 'Yesterday'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Note <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              maxLength={240}
              onChangeText={setNote}
              placeholder="Add a quick reminder"
              placeholderTextColor={colors.inkMuted}
              style={styles.textInput}
              value={note}
            />
          </View>

          {direction === 'outflow' ? <View style={styles.autoCard}>
            <MaterialCommunityIcons color={colors.primary} name="auto-fix" size={21} />
            <Text style={styles.autoText}>Future connected transactions will be categorized automatically, and you can always correct them.</Text>
          </View> : null}

          <Pressable disabled={!canSave} onPress={save} style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}>
            <Text style={styles.saveButtonText}>{saving ? 'Saving…' : `Save ${direction === 'outflow' ? 'expense' : 'income'}`}</Text>
          </Pressable>
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
  typePicker: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, flexDirection: 'row', padding: 4 },
  typeOption: { alignItems: 'center', borderRadius: radius.sm, flex: 1, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 46 },
  typeOptionSelected: { backgroundColor: colors.primary },
  typeText: { color: colors.inkMuted, fontSize: 14, fontWeight: '800' },
  typeTextSelected: { color: colors.white },
  amountBlock: { alignItems: 'center', paddingVertical: spacing.xl },
  amountLabel: { color: colors.inkMuted, fontSize: 12, fontWeight: '700' },
  amountLine: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: spacing.sm },
  currency: { color: colors.ink, fontSize: 34, fontWeight: '700', marginRight: spacing.xs },
  amountInput: { color: colors.ink, fontSize: 48, fontWeight: '800', minWidth: 150, padding: 0, textAlign: 'left' },
  fieldGroup: { gap: spacing.sm },
  fieldLabel: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  textInput: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.ink, fontSize: 16, height: 54, paddingHorizontal: spacing.lg },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  category: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 9 },
  categorySelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  categoryTextSelected: { color: colors.white },
  dateChoices: { flexDirection: 'row', gap: spacing.sm },
  dateChoice: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flex: 1, paddingVertical: 13 },
  dateChoiceSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  dateChoiceText: { color: colors.inkMuted, fontSize: 13, fontWeight: '700' },
  dateChoiceTextSelected: { color: colors.primaryDark, fontWeight: '800' },
  optional: { color: colors.inkMuted, fontWeight: '500' },
  autoCard: { alignItems: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  autoText: { color: colors.primaryDark, flex: 1, fontSize: 12, lineHeight: 18 },
  saveButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, marginTop: 'auto', padding: spacing.lg },
  saveButtonDisabled: { opacity: 0.35 },
  saveButtonText: { color: colors.white, fontSize: 16, fontWeight: '800' },
});
