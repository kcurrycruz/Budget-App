import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import type { Category, Transaction } from '../types';
import { formatMoney } from '../utils/money';

type ReviewTransactionModalProps = {
  categories: Category[];
  transaction: Transaction | null;
  saving: boolean;
  onClose: () => void;
  onSave: (categoryId: string) => void;
};

export function ReviewTransactionModal({
  categories,
  transaction,
  saving,
  onClose,
  onSave,
}: ReviewTransactionModalProps) {
  const [categoryId, setCategoryId] = useState('');

  useEffect(() => {
    setCategoryId(transaction?.categoryId ?? '');
  }, [transaction]);

  if (!transaction) return null;

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Close transaction review" disabled={saving} onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons color={colors.ink} name="close" size={22} />
          </Pressable>
          <Text style={styles.title}>Review transaction</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.transactionCard}>
          <View style={styles.transactionIcon}>
            <MaterialCommunityIcons color={colors.primaryDark} name="receipt-text-outline" size={25} />
          </View>
          <Text numberOfLines={2} style={styles.merchant}>{transaction.merchant}</Text>
          <Text style={styles.amount}>
            {transaction.direction === 'inflow' ? '+' : '−'}{formatMoney(transaction.amount, true)}
          </Text>
          <Text style={styles.account}>{transaction.account} · {transaction.date}</Text>
        </View>

        <View style={styles.guidance}>
          <MaterialCommunityIcons color={colors.primary} name="tag-check-outline" size={21} />
          <Text style={styles.guidanceText}>Choose where this belongs. Your monthly totals will update immediately.</Text>
        </View>

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
                  <View style={[styles.categoryIcon, selected && styles.categoryIconSelected]}>
                    <MaterialCommunityIcons
                      color={selected ? colors.white : category.color}
                      name={category.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                      size={21}
                    />
                  </View>
                  <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>{category.name}</Text>
                  {selected ? <MaterialCommunityIcons color={colors.white} name="check" size={20} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          disabled={!categoryId || saving}
          onPress={() => onSave(categoryId)}
          style={[styles.saveButton, (!categoryId || saving) && styles.saveButtonDisabled]}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save category'}</Text>
        </Pressable>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { backgroundColor: colors.background, flexGrow: 1, gap: spacing.xl, padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  closeButton: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, height: 40, justifyContent: 'center', width: 40 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  headerSpacer: { width: 40 },
  transactionCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, padding: spacing.xl },
  transactionIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.pill, height: 52, justifyContent: 'center', width: 52 },
  merchant: { color: colors.ink, fontSize: 20, fontWeight: '800', marginTop: spacing.md, textAlign: 'center' },
  amount: { color: colors.ink, fontSize: 34, fontWeight: '800', marginTop: spacing.xs },
  account: { color: colors.inkMuted, fontSize: 12, marginTop: spacing.sm },
  guidance: { alignItems: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  guidanceText: { color: colors.primaryDark, flex: 1, fontSize: 12, lineHeight: 18 },
  fieldGroup: { gap: spacing.md },
  fieldLabel: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  categories: { gap: spacing.sm },
  category: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing.md, minHeight: 58, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  categorySelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryIcon: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.sm, height: 38, justifyContent: 'center', width: 38 },
  categoryIconSelected: { backgroundColor: '#FFFFFF1F' },
  categoryText: { color: colors.ink, flex: 1, fontSize: 14, fontWeight: '700' },
  categoryTextSelected: { color: colors.white },
  saveButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, marginTop: 'auto', padding: spacing.lg },
  saveButtonDisabled: { opacity: 0.4 },
  saveButtonText: { color: colors.white, fontSize: 16, fontWeight: '800' },
});
