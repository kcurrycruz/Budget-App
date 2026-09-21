import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import type { Category, Transaction } from '../types';
import { formatMoney } from '../utils/money';

type ReviewTransactionModalProps = {
  categories: Category[];
  transaction: Transaction | null;
  deleting: boolean;
  saving: boolean;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onSave: (categoryId: string, subcategoryId?: string) => void;
};

export function ReviewTransactionModal({
  categories,
  transaction,
  deleting,
  saving,
  onClose,
  onDelete,
  onEdit,
  onSave,
}: ReviewTransactionModalProps) {
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');

  useEffect(() => {
    setCategoryId(transaction?.categoryId ?? '');
    setSubcategoryId(transaction?.subcategoryId ?? '');
  }, [transaction]);

  if (!transaction) return null;
  const isInflow = transaction.direction === 'inflow';
  const isManual = transaction.source === 'manual';
  const busy = saving || deleting;
  const selectedCategory = categories.find((category) => category.id === categoryId);

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Close transaction details" disabled={busy} onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons color={colors.ink} name="close" size={22} />
          </Pressable>
          <Text style={styles.title}>Transaction details</Text>
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
          {transaction.note ? <Text style={styles.note}>{transaction.note}</Text> : null}
        </View>

        {!isInflow ? <View style={styles.guidance}>
          <MaterialCommunityIcons color={colors.primary} name="tag-check-outline" size={21} />
          <Text style={styles.guidanceText}>
            {transaction.needsReview
              ? 'Choose where this belongs. Your monthly totals will update immediately.'
              : 'Change the category anytime. Your monthly totals will stay in sync.'}
          </Text>
        </View> : null}

        {!isInflow ? <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Category</Text>
          <View style={styles.categories}>
            {categories.map((category) => {
              const selected = category.id === categoryId;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  key={category.id}
                  onPress={() => {
                    setCategoryId(category.id);
                    setSubcategoryId('');
                  }}
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
        </View> : null}

        {!isInflow && selectedCategory?.subcategories.length ? <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Subcategory <Text style={styles.optional}>(optional)</Text></Text>
          <View style={styles.subcategories}>
            <Pressable onPress={() => setSubcategoryId('')} style={[styles.subcategory, !subcategoryId && styles.subcategorySelected]}>
              <Text style={[styles.subcategoryText, !subcategoryId && styles.subcategoryTextSelected]}>None</Text>
            </Pressable>
            {selectedCategory.subcategories.map((subcategory) => {
              const selected = subcategory.id === subcategoryId;
              return <Pressable key={subcategory.id} onPress={() => setSubcategoryId(subcategory.id)} style={[styles.subcategory, selected && styles.subcategorySelected]}>
                <Text style={[styles.subcategoryText, selected && styles.subcategoryTextSelected]}>{subcategory.name}</Text>
              </Pressable>;
            })}
          </View>
        </View> : null}

        {!isInflow ? (
          <Pressable
            disabled={!categoryId || busy}
            onPress={() => onSave(categoryId, subcategoryId || undefined)}
            style={[styles.saveButton, (!categoryId || busy) && styles.saveButtonDisabled]}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save category'}</Text>
          </Pressable>
        ) : null}

        {isManual ? (
          <View style={styles.manualActions}>
            <View style={styles.manualHeading}>
              <MaterialCommunityIcons color={colors.primaryDark} name="pencil-outline" size={20} />
              <View style={styles.manualCopy}>
                <Text style={styles.manualTitle}>Manual entry</Text>
                <Text style={styles.manualDetail}>You can edit every detail or remove this transaction.</Text>
              </View>
            </View>
            <View style={styles.actionRow}>
              <Pressable disabled={busy} onPress={onEdit} style={styles.editButton}>
                <Text style={styles.editButtonText}>Edit details</Text>
              </Pressable>
              <Pressable disabled={busy} onPress={onDelete} style={styles.deleteButton}>
                <Text style={styles.deleteButtonText}>{deleting ? 'Deleting…' : 'Delete'}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
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
  note: { backgroundColor: colors.surfaceMuted, borderRadius: radius.sm, color: colors.inkMuted, fontSize: 12, lineHeight: 18, marginTop: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, textAlign: 'center' },
  optional: { color: colors.inkMuted, fontWeight: '500' },
  subcategories: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  subcategory: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 9 },
  subcategorySelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  subcategoryText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  subcategoryTextSelected: { color: colors.white },
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
  manualActions: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  manualHeading: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  manualCopy: { flex: 1, gap: 3 },
  manualTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  manualDetail: { color: colors.inkMuted, fontSize: 12, lineHeight: 17 },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  editButton: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.sm, flex: 1, paddingVertical: 12 },
  editButtonText: { color: colors.primaryDark, fontSize: 13, fontWeight: '800' },
  deleteButton: { alignItems: 'center', borderColor: '#E8CACA', borderRadius: radius.sm, borderWidth: 1, flex: 1, paddingVertical: 12 },
  deleteButtonText: { color: colors.danger, fontSize: 13, fontWeight: '800' },
});
