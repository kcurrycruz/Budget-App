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
import type { Category } from '../types';

type TransactionDraft = { merchant: string; amount: number; categoryId: string };

type AddTransactionModalProps = {
  categories: Category[];
  visible: boolean;
  onClose: () => void;
  onSave: (draft: TransactionDraft) => void;
};

export function AddTransactionModal({ categories, visible, onClose, onSave }: AddTransactionModalProps) {
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? 'other');

  useEffect(() => {
    if (!visible) {
      setMerchant('');
      setAmount('');
      setCategoryId(categories[0]?.id ?? 'other');
    }
  }, [categories, visible]);

  const numericAmount = Number.parseFloat(amount);
  const canSave = merchant.trim().length > 0 && Number.isFinite(numericAmount) && numericAmount > 0;

  const save = () => {
    if (!canSave) return;
    onSave({ merchant: merchant.trim(), amount: numericAmount, categoryId });
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={visible}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons color={colors.ink} name="close" size={22} />
            </Pressable>
            <Text style={styles.title}>Add expense</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.amountBlock}>
            <Text style={styles.amountLabel}>Amount</Text>
            <View style={styles.amountLine}>
              <Text style={styles.currency}>$</Text>
              <TextInput
                autoFocus
                keyboardType="decimal-pad"
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor="#A7B0AA"
                style={styles.amountInput}
                value={amount}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Where did you spend?</Text>
            <TextInput
              autoCapitalize="words"
              onChangeText={setMerchant}
              placeholder="Merchant or description"
              placeholderTextColor={colors.inkMuted}
              style={styles.textInput}
              value={merchant}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.categories}>
              {categories.map((category) => {
                const selected = category.id === categoryId;
                return (
                  <Pressable
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

          <View style={styles.autoCard}>
            <MaterialCommunityIcons color={colors.primary} name="auto-fix" size={21} />
            <Text style={styles.autoText}>Future connected transactions will be categorized automatically, and you can always correct them.</Text>
          </View>

          <Pressable disabled={!canSave} onPress={save} style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}>
            <Text style={styles.saveButtonText}>Save expense</Text>
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
  amountBlock: { alignItems: 'center', paddingVertical: spacing.xl },
  amountLabel: { color: colors.inkMuted, fontSize: 12, fontWeight: '700' },
  amountLine: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: spacing.sm },
  currency: { color: colors.ink, fontSize: 34, fontWeight: '700', marginRight: spacing.xs },
  amountInput: { color: colors.ink, fontSize: 48, fontWeight: '800', minWidth: 150, padding: 0 },
  fieldGroup: { gap: spacing.sm },
  fieldLabel: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  textInput: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.ink, fontSize: 16, height: 54, paddingHorizontal: spacing.lg },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  category: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 9 },
  categorySelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  categoryTextSelected: { color: colors.white },
  autoCard: { alignItems: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  autoText: { color: colors.primaryDark, flex: 1, fontSize: 12, lineHeight: 18 },
  saveButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, marginTop: 'auto', padding: spacing.lg },
  saveButtonDisabled: { opacity: 0.35 },
  saveButtonText: { color: colors.white, fontSize: 16, fontWeight: '800' },
});
