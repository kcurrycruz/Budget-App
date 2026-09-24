import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import type { Category, CategoryDraft, SpendingGroup, Subcategory } from '../types';

const colorOptions = ['#247A52', '#CA6946', '#4777B8', '#9A6AB3', '#D09625', '#3F7C8E'];
const iconOptions = ['home-outline', 'food-fork-drink', 'car-outline', 'shopping-outline', 'heart-pulse', 'wallet-outline', 'gamepad-variant-outline', 'dots-horizontal-circle-outline'] as const;
const spendingGroups: { detail: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; id: SpendingGroup; label: string }[] = [
  { id: 'needs', label: 'Needs', detail: 'Essentials and required bills', icon: 'home-heart' },
  { id: 'wants', label: 'Wants', detail: 'Optional and lifestyle spending', icon: 'star-outline' },
  { id: 'savings', label: 'Savings', detail: 'Goals, investing, and reserves', icon: 'piggy-bank-outline' },
];

type Props = {
  archivedCategories: Category[];
  categories: Category[];
  visible: boolean;
  onArchiveCategory: (category: Category) => Promise<void>;
  onClose: () => void;
  onMoveCategory: (category: Category, direction: -1 | 1) => Promise<void>;
  onRestoreCategory: (category: Category) => Promise<void>;
  onSaveCategory: (category: Category | null, draft: CategoryDraft) => Promise<void>;
  onSaveSubcategory: (categoryId: string, name: string, subcategory?: Subcategory) => Promise<void>;
};

export function CategoryManagerModal({ archivedCategories, categories, visible, onArchiveCategory, onClose, onMoveCategory, onRestoreCategory, onSaveCategory, onSaveSubcategory }: Props) {
  const [editing, setEditing] = useState<Category | null | undefined>(undefined);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(colorOptions[0]!);
  const [icon, setIcon] = useState<(typeof iconOptions)[number]>('wallet-outline');
  const [spendingGroup, setSpendingGroup] = useState<SpendingGroup>('needs');
  const [subcategory, setSubcategory] = useState<Subcategory | undefined>();
  const [subcategoryName, setSubcategoryName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) {
      setEditing(undefined);
      setError('');
    }
  }, [visible]);

  const openEditor = (category: Category | null) => {
    setEditing(category);
    setName(category?.name ?? '');
    setColor(category?.color ?? colorOptions[0]!);
    setIcon((category?.icon as (typeof iconOptions)[number]) ?? 'wallet-outline');
    setSpendingGroup(category?.spendingGroup ?? 'needs');
    setSubcategory(undefined);
    setSubcategoryName('');
    setError('');
  };

  const saveCategory = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await onSaveCategory(editing ?? null, { name: name.trim(), color, icon, spendingGroup });
      setEditing(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save this category.');
    } finally {
      setSaving(false);
    }
  };

  const saveSubcategory = async () => {
    if (!editing || !subcategoryName.trim()) return;
    setSaving(true);
    setError('');
    try {
      await onSaveSubcategory(editing.id, subcategoryName.trim(), subcategory);
      setSubcategory(undefined);
      setSubcategoryName('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save this subcategory.');
    } finally {
      setSaving(false);
    }
  };

  const moveCategory = async (category: Category, direction: -1 | 1) => {
    setSaving(true);
    setError('');
    try {
      await onMoveCategory(category, direction);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not reorder your categories.');
    } finally {
      setSaving(false);
    }
  };

  const performArchiveCategory = async (category: Category) => {
    setSaving(true);
    setError('');
    try {
      await onArchiveCategory(category);
      setEditing(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not archive this category.');
    } finally {
      setSaving(false);
    }
  };

  const confirmArchiveCategory = (category: Category) => {
    Alert.alert(
      `Archive ${category.name}?`,
      'It will leave your plan and new transaction choices. Existing transactions stay in your history.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', style: 'destructive', onPress: () => { void performArchiveCategory(category); } },
      ],
    );
  };

  const restoreCategory = async (category: Category) => {
    setSaving(true);
    setError('');
    try {
      await onRestoreCategory(category);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not restore this category.');
    } finally {
      setSaving(false);
    }
  };

  const currentCategory = editing ? categories.find((item) => item.id === editing.id) ?? editing : editing;

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={visible}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.page}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable accessibilityLabel={editing !== undefined ? 'Back to categories' : 'Close category manager'} disabled={saving} onPress={editing !== undefined ? () => setEditing(undefined) : onClose} style={styles.closeButton}>
              <MaterialCommunityIcons color={colors.ink} name={editing !== undefined ? 'arrow-left' : 'close'} size={22} />
            </Pressable>
            <Text style={styles.title}>{editing === undefined ? 'Manage categories' : editing ? 'Edit category' : 'New category'}</Text>
            <View style={styles.headerSpacer} />
          </View>

          {editing === undefined ? <>
            <View style={styles.intro}>
              <MaterialCommunityIcons color={colors.primaryDark} name="shape-outline" size={22} />
              <Text style={styles.introText}>Use the arrows to set your plan order. Open a category to edit details, add subcategories, or archive it.</Text>
            </View>
            <View style={styles.list}>
              {categories.map((category, index) => <View key={category.id}>
                <View style={styles.row}>
                  <Pressable accessibilityLabel={`Edit ${category.name}`} onPress={() => openEditor(category)} style={styles.rowMain}>
                    <View style={[styles.iconBox, { backgroundColor: `${category.color}1A` }]}>
                      <MaterialCommunityIcons color={category.color} name={category.icon as keyof typeof MaterialCommunityIcons.glyphMap} size={22} />
                    </View>
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowTitle}>{category.name}</Text>
                      <Text numberOfLines={1} style={styles.rowDetail}>{spendingGroups.find((group) => group.id === category.spendingGroup)?.label ?? 'Needs'} · {category.subcategories.length ? category.subcategories.map((item) => item.name).join(' · ') : 'No subcategories'}</Text>
                    </View>
                  </Pressable>
                  <View style={styles.reorderActions}>
                    <Pressable accessibilityLabel={`Move ${category.name} up`} disabled={saving || index === 0} onPress={() => { void moveCategory(category, -1); }} style={[styles.orderButton, index === 0 && styles.orderButtonDisabled]}>
                      <MaterialCommunityIcons color={colors.inkMuted} name="chevron-up" size={20} />
                    </Pressable>
                    <Pressable accessibilityLabel={`Move ${category.name} down`} disabled={saving || index === categories.length - 1} onPress={() => { void moveCategory(category, 1); }} style={[styles.orderButton, index === categories.length - 1 && styles.orderButtonDisabled]}>
                      <MaterialCommunityIcons color={colors.inkMuted} name="chevron-down" size={20} />
                    </Pressable>
                  </View>
                  <Pressable accessibilityLabel={`Edit ${category.name}`} onPress={() => openEditor(category)} style={styles.editCategoryButton}>
                    <MaterialCommunityIcons color={colors.inkMuted} name="chevron-right" size={21} />
                  </Pressable>
                </View>
                {index < categories.length - 1 ? <View style={styles.divider} /> : null}
              </View>)}
            </View>
            <Pressable onPress={() => openEditor(null)} style={styles.primaryButton}>
              <MaterialCommunityIcons color={colors.white} name="plus" size={20} />
              <Text style={styles.primaryButtonText}>Add category</Text>
            </Pressable>
            {archivedCategories.length ? <View style={styles.archivedSection}>
              <View>
                <Text style={styles.archivedTitle}>Archived</Text>
                <Text style={styles.archivedDetail}>Hidden from your plan and new transactions.</Text>
              </View>
              <View style={styles.archivedList}>
                {archivedCategories.map((category, index) => <View key={category.id}>
                  <View style={styles.archivedRow}>
                    <View style={[styles.archivedIcon, { backgroundColor: `${category.color}1A` }]}>
                      <MaterialCommunityIcons color={category.color} name={category.icon as keyof typeof MaterialCommunityIcons.glyphMap} size={19} />
                    </View>
                    <Text numberOfLines={1} style={styles.archivedName}>{category.name}</Text>
                    <Pressable accessibilityLabel={`Restore ${category.name}`} disabled={saving} onPress={() => { void restoreCategory(category); }} style={styles.restoreButton}>
                      <Text style={styles.restoreText}>Restore</Text>
                    </Pressable>
                  </View>
                  {index < archivedCategories.length - 1 ? <View style={styles.archivedDivider} /> : null}
                </View>)}
              </View>
            </View> : null}
          </> : <>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Category name</Text>
              <TextInput autoCapitalize="words" maxLength={50} onChangeText={setName} placeholder="e.g. Travel" placeholderTextColor={colors.inkMuted} style={styles.input} value={name} />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Color</Text>
              <View style={styles.optionRow}>{colorOptions.map((option) => <Pressable accessibilityLabel={`Use color ${option}`} key={option} onPress={() => setColor(option)} style={[styles.colorOption, { backgroundColor: option }, color === option && styles.colorSelected]}>{color === option ? <MaterialCommunityIcons color={colors.white} name="check" size={18} /> : null}</Pressable>)}</View>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Icon</Text>
              <View style={styles.optionRow}>{iconOptions.map((option) => <Pressable key={option} onPress={() => setIcon(option)} style={[styles.iconOption, icon === option && { backgroundColor: color, borderColor: color }]}><MaterialCommunityIcons color={icon === option ? colors.white : colors.inkMuted} name={option} size={22} /></Pressable>)}</View>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Money group</Text>
              <Text style={styles.fieldDetail}>Used only for your Needs, Wants, and Savings percentages.</Text>
              <View style={styles.groupOptions}>{spendingGroups.map((group) => <Pressable accessibilityLabel={`Classify as ${group.label}`} key={group.id} onPress={() => setSpendingGroup(group.id)} style={[styles.groupOption, spendingGroup === group.id && styles.groupOptionSelected]}>
                <View style={[styles.groupIcon, spendingGroup === group.id && styles.groupIconSelected]}>
                  <MaterialCommunityIcons color={spendingGroup === group.id ? colors.white : colors.primaryDark} name={group.icon} size={19} />
                </View>
                <View style={styles.groupCopy}>
                  <Text style={styles.groupLabel}>{group.label}</Text>
                  <Text style={styles.groupDetail}>{group.detail}</Text>
                </View>
                {spendingGroup === group.id ? <MaterialCommunityIcons color={colors.primary} name="check-circle" size={21} /> : null}
              </Pressable>)}</View>
            </View>
            <Pressable disabled={saving || !name.trim()} onPress={() => { void saveCategory(); }} style={[styles.primaryButton, (saving || !name.trim()) && styles.disabled]}>
              <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : editing ? 'Save category' : 'Create category'}</Text>
            </Pressable>

            {currentCategory ? <View style={styles.subcategoryCard}>
              <View>
                <Text style={styles.subcategoryTitle}>Subcategories</Text>
                <Text style={styles.subcategoryDetail}>Optional labels that sit inside {currentCategory.name}.</Text>
              </View>
              {currentCategory.subcategories.map((item) => <Pressable key={item.id} onPress={() => { setSubcategory(item); setSubcategoryName(item.name); }} style={styles.subcategoryRow}>
                <Text style={styles.subcategoryRowText}>{item.name}</Text>
                <MaterialCommunityIcons color={colors.inkMuted} name="pencil-outline" size={18} />
              </Pressable>)}
              <View style={styles.addSubcategory}>
                <TextInput maxLength={50} onChangeText={setSubcategoryName} placeholder="Add a subcategory" placeholderTextColor={colors.inkMuted} style={styles.subcategoryInput} value={subcategoryName} />
                <Pressable disabled={saving || !subcategoryName.trim()} onPress={() => { void saveSubcategory(); }} style={[styles.addButton, (saving || !subcategoryName.trim()) && styles.disabled]}>
                  <Text style={styles.addButtonText}>{subcategory ? 'Save' : 'Add'}</Text>
                </Pressable>
              </View>
              {subcategory ? <Pressable onPress={() => { setSubcategory(undefined); setSubcategoryName(''); }}><Text style={styles.cancelEdit}>Cancel rename</Text></Pressable> : null}
            </View> : null}
            {currentCategory ? <View style={styles.archiveBlock}>
              <Pressable disabled={saving || categories.length <= 1} onPress={() => confirmArchiveCategory(currentCategory)} style={[styles.archiveButton, categories.length <= 1 && styles.disabled]}>
                <MaterialCommunityIcons color={colors.danger} name="archive-arrow-down-outline" size={19} />
                <Text style={styles.archiveText}>Archive category</Text>
              </Pressable>
              {categories.length <= 1 ? <Text style={styles.archiveHint}>Zenify needs at least one active category.</Text> : null}
            </View> : null}
          </>}
          {error ? <Text style={styles.error}>{error.includes('duplicate') ? 'That name is already in use.' : error}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background, flex: 1 },
  content: { gap: spacing.xl, padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  closeButton: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, height: 40, justifyContent: 'center', width: 40 },
  headerSpacer: { width: 40 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  intro: { alignItems: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  introText: { color: colors.primaryDark, flex: 1, fontSize: 13, lineHeight: 19 },
  list: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.lg },
  row: { alignItems: 'center', flexDirection: 'row', paddingVertical: spacing.md },
  rowMain: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: spacing.md, minWidth: 0 },
  iconBox: { alignItems: 'center', borderRadius: radius.md, height: 44, justifyContent: 'center', width: 44 },
  rowCopy: { flex: 1, gap: 3 },
  rowTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  rowDetail: { color: colors.inkMuted, fontSize: 11, lineHeight: 16 },
  reorderActions: { gap: 2, marginLeft: spacing.xs },
  orderButton: { alignItems: 'center', height: 28, justifyContent: 'center', width: 30 },
  orderButtonDisabled: { opacity: 0.2 },
  editCategoryButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 30 },
  divider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth, marginLeft: 56 },
  fieldGroup: { gap: spacing.sm },
  label: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  fieldDetail: { color: colors.inkMuted, fontSize: 11, lineHeight: 16, marginTop: -4 },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.ink, fontSize: 16, height: 54, paddingHorizontal: spacing.lg },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  colorOption: { alignItems: 'center', borderColor: colors.background, borderRadius: radius.pill, borderWidth: 3, height: 42, justifyContent: 'center', width: 42 },
  colorSelected: { borderColor: colors.ink },
  iconOption: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, height: 48, justifyContent: 'center', width: 48 },
  groupOptions: { gap: spacing.sm },
  groupOption: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing.md, minHeight: 68, padding: spacing.md },
  groupOptionSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  groupIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.sm, height: 38, justifyContent: 'center', width: 38 },
  groupIconSelected: { backgroundColor: colors.primary },
  groupCopy: { flex: 1, gap: 2 },
  groupLabel: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  groupDetail: { color: colors.inkMuted, fontSize: 10, lineHeight: 14 },
  primaryButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 52, paddingHorizontal: spacing.lg },
  primaryButtonText: { color: colors.white, fontSize: 15, fontWeight: '800' },
  archivedSection: { gap: spacing.md },
  archivedTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  archivedDetail: { color: colors.inkMuted, fontSize: 11, marginTop: 3 },
  archivedList: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md },
  archivedRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 58, paddingVertical: spacing.sm },
  archivedIcon: { alignItems: 'center', borderRadius: radius.sm, height: 36, justifyContent: 'center', width: 36 },
  archivedName: { color: colors.inkMuted, flex: 1, fontSize: 13, fontWeight: '700' },
  restoreButton: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  restoreText: { color: colors.primaryDark, fontSize: 11, fontWeight: '800' },
  archivedDivider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth, marginLeft: 44 },
  disabled: { opacity: 0.35 },
  subcategoryCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  subcategoryTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  subcategoryDetail: { color: colors.inkMuted, fontSize: 12, marginTop: 3 },
  subcategoryRow: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.sm, flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md },
  subcategoryRowText: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  addSubcategory: { flexDirection: 'row', gap: spacing.sm },
  subcategoryInput: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, color: colors.ink, flex: 1, fontSize: 14, height: 46, paddingHorizontal: spacing.md },
  addButton: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.sm, justifyContent: 'center', paddingHorizontal: spacing.lg },
  addButtonText: { color: colors.primaryDark, fontSize: 13, fontWeight: '800' },
  cancelEdit: { color: colors.inkMuted, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  archiveBlock: { alignItems: 'center', gap: spacing.sm },
  archiveButton: { alignItems: 'center', borderColor: `${colors.danger}55`, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 48, width: '100%' },
  archiveText: { color: colors.danger, fontSize: 13, fontWeight: '800' },
  archiveHint: { color: colors.inkMuted, fontSize: 11 },
  error: { color: colors.danger, fontSize: 12, textAlign: 'center' },
});
