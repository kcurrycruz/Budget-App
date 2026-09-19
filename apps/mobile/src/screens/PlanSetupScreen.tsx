import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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

type PlanSetupScreenProps = {
  categories: Category[];
  onSave: (input: { bills: number; categoryBudgets: Record<string, number>; income: number }) => Promise<void>;
};

export function PlanSetupScreen({ categories, onSave }: PlanSetupScreenProps) {
  const [income, setIncome] = useState('');
  const [bills, setBills] = useState('');
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, string>>(() => (
    Object.fromEntries(categories.map((category) => [category.id, category.budget ? String(category.budget) : '']))
  ));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPlanned = useMemo(() => (
    Number(bills || 0) + Object.values(categoryBudgets).reduce((sum, value) => sum + Number(value || 0), 0)
  ), [bills, categoryBudgets]);
  const numericIncome = Number(income);
  const canSave = Number.isFinite(numericIncome) && numericIncome > 0 && !busy;

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    setError(null);
    try {
      await onSave({
        income: numericIncome,
        bills: Number(bills || 0),
        categoryBudgets: Object.fromEntries(Object.entries(categoryBudgets).map(([id, value]) => [id, Number(value || 0)])),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'We could not save your plan. Please try again.');
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.icon}>
          <MaterialCommunityIcons color={colors.primaryDark} name="calendar-check-outline" size={30} />
        </View>
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>ONE-TIME SETUP</Text>
          <Text style={styles.title}>Build your first monthly plan</Text>
          <Text style={styles.detail}>Start broad. You can adjust every number later as the app learns your routine.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly take-home income</Text>
          <MoneyInput onChangeText={setIncome} placeholder="7,000" value={income} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bills and fixed costs</Text>
          <MoneyInput onChangeText={setBills} placeholder="2,800" value={bills} />
          <Text style={styles.hint}>Rent, utilities, debt payments, subscriptions, and other commitments.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Flexible spending limits</Text>
          <View style={styles.categoryList}>
            {categories.map((category, index) => (
              <View key={category.id}>
                <View style={styles.categoryRow}>
                  <View style={[styles.categoryIcon, { backgroundColor: `${category.color}1A` }]}>
                    <MaterialCommunityIcons
                      color={category.color}
                      name={category.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                      size={20}
                    />
                  </View>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <View style={styles.compactInput}>
                    <Text style={styles.currency}>$</Text>
                    <TextInput
                      keyboardType="decimal-pad"
                      onChangeText={(value) => setCategoryBudgets((current) => ({ ...current, [category.id]: value }))}
                      placeholder="0"
                      placeholderTextColor={colors.inkMuted}
                      style={styles.compactTextInput}
                      value={categoryBudgets[category.id] ?? ''}
                    />
                  </View>
                </View>
                {index < categories.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Planned so far</Text>
          <Text style={styles.summaryValue}>${totalPlanned.toLocaleString('en-US', { maximumFractionDigits: 2 })}</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable disabled={!canSave} onPress={() => { void save(); }} style={[styles.saveButton, !canSave && styles.disabled]}>
          {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>Save my plan</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type MoneyInputProps = { onChangeText: (value: string) => void; placeholder: string; value: string };

function MoneyInput({ onChangeText, placeholder, value }: MoneyInputProps) {
  return (
    <View style={styles.moneyInput}>
      <Text style={styles.moneyCurrency}>$</Text>
      <TextInput
        keyboardType="decimal-pad"
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkMuted}
        style={styles.moneyTextInput}
        value={value}
      />
      <Text style={styles.perMonth}>/ month</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.background, flex: 1 },
  content: { gap: spacing.xl, padding: spacing.xl, paddingBottom: 48 },
  icon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 58, justifyContent: 'center', marginTop: spacing.md, width: 58 },
  intro: { gap: spacing.sm },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  title: { color: colors.ink, fontSize: 31, fontWeight: '800', letterSpacing: -0.8 },
  detail: { color: colors.inkMuted, fontSize: 14, lineHeight: 21 },
  section: { gap: spacing.sm },
  sectionTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  hint: { color: colors.inkMuted, fontSize: 11, lineHeight: 16 },
  moneyInput: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', paddingHorizontal: spacing.lg },
  moneyCurrency: { color: colors.ink, fontSize: 22, fontWeight: '800' },
  moneyTextInput: { color: colors.ink, flex: 1, fontSize: 24, fontWeight: '800', height: 58, paddingHorizontal: spacing.sm },
  perMonth: { color: colors.inkMuted, fontSize: 12, fontWeight: '700' },
  categoryList: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.lg },
  categoryRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md },
  categoryIcon: { alignItems: 'center', borderRadius: radius.sm, height: 38, justifyContent: 'center', width: 38 },
  categoryName: { color: colors.ink, flex: 1, fontSize: 14, fontWeight: '800' },
  compactInput: { alignItems: 'center', backgroundColor: colors.background, borderRadius: radius.sm, flexDirection: 'row', paddingHorizontal: spacing.sm, width: 94 },
  currency: { color: colors.inkMuted, fontSize: 13, fontWeight: '800' },
  compactTextInput: { color: colors.ink, flex: 1, fontSize: 15, fontWeight: '800', height: 42, paddingHorizontal: 4, textAlign: 'right' },
  divider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth, marginLeft: 50 },
  summary: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg },
  summaryLabel: { color: colors.primaryDark, fontSize: 13, fontWeight: '800' },
  summaryValue: { color: colors.primaryDark, fontSize: 19, fontWeight: '800' },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18 },
  saveButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, height: 56, justifyContent: 'center' },
  saveText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.4 },
});
