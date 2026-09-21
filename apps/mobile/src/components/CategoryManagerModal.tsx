import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import type { Category, CategoryDraft, Subcategory } from '../types';

const colorOptions = ['#247A52', '#CA6946', '#4777B8', '#9A6AB3', '#D09625', '#3F7C8E'];
const iconOptions = ['home-outline', 'food-fork-drink', 'car-outline', 'shopping-outline', 'heart-pulse', 'wallet-outline', 'gamepad-variant-outline', 'dots-horizontal-circle-outline'] as const;

type Props = {
  categories: Category[];
  visible: boolean;
  onClose: () => void;
  onSaveCategory: (category: Category | null, draft: CategoryDraft) => Promise<void>;
  onSaveSubcategory: (categoryId: string, name: string, subcategory?: Subcategory) => Promise<void>;
};

export function CategoryManagerModal({ categories, visible, onClose, onSaveCategory, onSaveSubcategory }: Props) {
  const [editing, setEditing] = useState<Category | null | undefined>(undefined);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(colorOptions[0]!);
  const [icon, setIcon] = useState<(typeof iconOptions)[number]>('wallet-outline');
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
    setSubcategory(undefined);
    setSubcategoryName('');
    setError('');
  };

  const saveCategory = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await onSaveCategory(editing ?? null, { name: name.trim(), color, icon });
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
              <Text style={styles.introText}>Keep the main groups broad. Add subcategories only when the extra detail helps.</Text>
            </View>
            <View style={styles.list}>
              {categories.map((category, index) => <View key={category.id}>
                <Pressable onPress={() => openEditor(category)} style={styles.row}>
                  <View style={[styles.iconBox, { backgroundColor: `${category.color}1A` }]}>
                    <MaterialCommunityIcons color={category.color} name={category.icon as keyof typeof MaterialCommunityIcons.glyphMap} size={22} />
                  </View>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>{category.name}</Text>
                    <Text style={styles.rowDetail}>{category.subcategories.length ? category.subcategories.map((item) => item.name).join(' · ') : 'No subcategories'}</Text>
                  </View>
                  <MaterialCommunityIcons color={colors.inkMuted} name="chevron-right" size={21} />
                </Pressable>
                {index < categories.length - 1 ? <View style={styles.divider} /> : null}
              </View>)}
            </View>
            <Pressable onPress={() => openEditor(null)} style={styles.primaryButton}>
              <MaterialCommunityIcons color={colors.white} name="plus" size={20} />
              <Text style={styles.primaryButtonText}>Add category</Text>
            </Pressable>
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
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.lg },
  iconBox: { alignItems: 'center', borderRadius: radius.md, height: 44, justifyContent: 'center', width: 44 },
  rowCopy: { flex: 1, gap: 3 },
  rowTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  rowDetail: { color: colors.inkMuted, fontSize: 11, lineHeight: 16 },
  divider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth, marginLeft: 56 },
  fieldGroup: { gap: spacing.sm },
  label: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.ink, fontSize: 16, height: 54, paddingHorizontal: spacing.lg },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  colorOption: { alignItems: 'center', borderColor: colors.background, borderRadius: radius.pill, borderWidth: 3, height: 42, justifyContent: 'center', width: 42 },
  colorSelected: { borderColor: colors.ink },
  iconOption: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, height: 48, justifyContent: 'center', width: 48 },
  primaryButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 52, paddingHorizontal: spacing.lg },
  primaryButtonText: { color: colors.white, fontSize: 15, fontWeight: '800' },
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
  error: { color: colors.danger, fontSize: 12, textAlign: 'center' },
});
