import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import type { Category, MerchantRule } from '../types';

type MerchantRulesModalProps = {
  categories: Category[];
  onClose: () => void;
  onDelete: (ruleId: string) => Promise<void>;
  rules: MerchantRule[];
  visible: boolean;
};

export function MerchantRulesModal({ categories, onClose, onDelete, rules, visible }: MerchantRulesModalProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteRule = async (rule: MerchantRule) => {
    setDeletingId(rule.id);
    try {
      await onDelete(rule.id);
    } catch (caught) {
      Alert.alert('Could not remove rule', caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDelete = (rule: MerchantRule) => {
    Alert.alert(
      'Remove this merchant rule?',
      `Future transactions from ${rule.merchantName} will need to be categorized again. Past transactions will not change.`,
      [
        { text: 'Keep rule', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => { void deleteRule(rule); } },
      ],
    );
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={visible}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} testID="merchant-rules-modal">
        <View style={styles.header}>
          <Pressable accessibilityLabel="Close merchant rules" disabled={Boolean(deletingId)} onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons color={colors.ink} name="close" size={22} />
          </Pressable>
          <Text style={styles.headerTitle}>Merchant rules</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <MaterialCommunityIcons color={colors.primaryDark} name="auto-fix" size={25} />
          </View>
          <View style={styles.introCopy}>
            <Text style={styles.introTitle}>Your automatic categories</Text>
            <Text style={styles.introDetail}>Zenify uses these rules when new bank transactions arrive.</Text>
          </View>
        </View>

        {rules.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons color={colors.inkMuted} name="tag-outline" size={32} />
            <Text style={styles.emptyTitle}>No saved rules yet</Text>
            <Text style={styles.emptyDetail}>Open a bank transaction, choose its category, and leave “Use this for future transactions” turned on.</Text>
          </View>
        ) : (
          <View style={styles.ruleList}>
            {rules.map((rule) => {
              const category = categories.find((item) => item.id === rule.categoryId);
              const subcategory = category?.subcategories.find((item) => item.id === rule.subcategoryId);
              const categoryLabel = category
                ? `${category.name}${subcategory ? ` / ${subcategory.name}` : ''}`
                : 'Category unavailable';
              const deleting = deletingId === rule.id;

              return (
                <View key={rule.id} style={styles.ruleCard} testID={`merchant-rule-${rule.id}`}>
                  <View style={[styles.ruleIcon, { backgroundColor: `${category?.color ?? colors.primary}1A` }]}>
                    <MaterialCommunityIcons
                      color={category?.color ?? colors.primary}
                      name={(category?.icon ?? 'tag-outline') as keyof typeof MaterialCommunityIcons.glyphMap}
                      size={22}
                    />
                  </View>
                  <View style={styles.ruleCopy}>
                    <Text numberOfLines={1} style={styles.merchantName}>{rule.merchantName}</Text>
                    <Text numberOfLines={1} style={styles.categoryName}>{categoryLabel}</Text>
                  </View>
                  <Pressable
                    accessibilityLabel={`Remove ${rule.merchantName} rule`}
                    disabled={Boolean(deletingId)}
                    onPress={() => confirmDelete(rule)}
                    style={styles.removeButton}
                  >
                    {deleting
                      ? <ActivityIndicator color={colors.danger} size="small" />
                      : <MaterialCommunityIcons color={colors.danger} name="trash-can-outline" size={20} />}
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.footerNote}>Removing a rule never changes transactions you already reviewed.</Text>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { backgroundColor: colors.background, flexGrow: 1, gap: spacing.xl, padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  closeButton: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, height: 40, justifyContent: 'center', width: 40 },
  headerTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  headerSpacer: { width: 40 },
  introCard: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  introIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.pill, height: 48, justifyContent: 'center', width: 48 },
  introCopy: { flex: 1, gap: 3 },
  introTitle: { color: colors.primaryDark, fontSize: 15, fontWeight: '800' },
  introDetail: { color: colors.primaryDark, fontSize: 12, lineHeight: 17 },
  emptyCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, gap: spacing.sm, padding: spacing.xxl },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: spacing.xs },
  emptyDetail: { color: colors.inkMuted, fontSize: 12, lineHeight: 18, maxWidth: 320, textAlign: 'center' },
  ruleList: { gap: spacing.sm },
  ruleCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  ruleIcon: { alignItems: 'center', borderRadius: radius.md, height: 46, justifyContent: 'center', width: 46 },
  ruleCopy: { flex: 1, gap: 3 },
  merchantName: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  categoryName: { color: colors.inkMuted, fontSize: 12 },
  removeButton: { alignItems: 'center', borderColor: '#E8CACA', borderRadius: radius.pill, borderWidth: 1, height: 40, justifyContent: 'center', width: 40 },
  footerNote: { color: colors.inkMuted, fontSize: 11, lineHeight: 16, paddingHorizontal: spacing.md, textAlign: 'center' },
});
