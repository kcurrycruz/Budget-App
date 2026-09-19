import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ProgressBar } from '../components/ProgressBar';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, radius, spacing } from '../theme';
import type { Category } from '../types';
import { formatMoney } from '../utils/money';

type PlanScreenProps = {
  categories: Category[];
  income: number;
  bills: number;
};

export function PlanScreen({ categories, income, bills }: PlanScreenProps) {
  const flexibleBudget = categories.reduce((sum, category) => sum + category.budget, 0);
  const planned = bills + flexibleBudget;
  const buffer = income - planned;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScreenHeader detail="Give every dollar a simple job." eyebrow="September" title="Monthly plan" />

      <View style={styles.planCard}>
        <View style={styles.planTop}>
          <View>
            <Text style={styles.label}>Planned</Text>
            <Text style={styles.planValue}>{formatMoney(planned)}</Text>
          </View>
          <View style={styles.bufferBlock}>
            <Text style={styles.label}>Buffer</Text>
            <Text style={styles.bufferValue}>{formatMoney(buffer)}</Text>
          </View>
        </View>
        <View style={styles.planTrack}>
          <View style={[styles.planTrackFill, { width: `${Math.min(planned / income, 1) * 100}%` }]} />
        </View>
        <Text style={styles.planDetail}>{formatMoney(income)} expected income</Text>
      </View>

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Fixed costs</Text>
        <Text style={styles.sectionValue}>{formatMoney(bills)}</Text>
      </View>
      <View style={styles.fixedCard}>
        <View style={styles.fixedIcon}>
          <MaterialCommunityIcons color={colors.primary} name="calendar-sync-outline" size={25} />
        </View>
        <View style={styles.fixedCopy}>
          <Text style={styles.fixedTitle}>Bills and commitments</Text>
          <Text style={styles.fixedDetail}>Housing, utilities, debt, and subscriptions</Text>
        </View>
        <MaterialCommunityIcons color={colors.inkMuted} name="chevron-right" size={22} />
      </View>

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Flexible spending</Text>
        <Text style={styles.sectionValue}>{formatMoney(flexibleBudget)}</Text>
      </View>
      <View style={styles.categoryList}>
        {categories.map((category, index) => (
          <View key={category.id}>
            <View style={styles.categoryRow}>
              <View style={[styles.icon, { backgroundColor: `${category.color}1A` }]}>
                <MaterialCommunityIcons
                  color={category.color}
                  name={category.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                  size={21}
                />
              </View>
              <View style={styles.categoryCopy}>
                <View style={styles.categoryTop}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categoryAmount}>{formatMoney(category.spent)} / {formatMoney(category.budget)}</Text>
                </View>
                <ProgressBar color={category.color} value={category.spent / category.budget} />
              </View>
            </View>
            {index < categories.length - 1 ? <View style={styles.divider} /> : null}
          </View>
        ))}
      </View>

      <View style={styles.tipCard}>
        <MaterialCommunityIcons color={colors.primaryDark} name="lightbulb-on-outline" size={22} />
        <Text style={styles.tipText}>Start with broad categories. The app can suggest more detail after it learns your spending.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, padding: spacing.lg, paddingBottom: spacing.xxl, paddingTop: spacing.xl },
  planCard: { backgroundColor: colors.primaryDark, borderRadius: radius.lg, gap: spacing.lg, padding: spacing.xl },
  planTop: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: '#BFD8C9', fontSize: 12, fontWeight: '700' },
  planValue: { color: colors.white, fontSize: 32, fontWeight: '800', marginTop: spacing.xs },
  bufferBlock: { alignItems: 'flex-end' },
  bufferValue: { color: '#93E0AD', fontSize: 20, fontWeight: '800', marginTop: spacing.xs },
  planTrack: { backgroundColor: '#FFFFFF1F', borderRadius: radius.pill, height: 10, overflow: 'hidden' },
  planTrackFill: { backgroundColor: colors.accent, borderRadius: radius.pill, height: '100%' },
  planDetail: { color: '#BFD8C9', fontSize: 12 },
  sectionTitleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: -spacing.md },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  sectionValue: { color: colors.inkMuted, fontSize: 14, fontWeight: '800' },
  fixedCard: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  fixedIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 48, justifyContent: 'center', width: 48 },
  fixedCopy: { flex: 1, gap: 3 },
  fixedTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  fixedDetail: { color: colors.inkMuted, fontSize: 12, lineHeight: 17 },
  categoryList: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.lg },
  categoryRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.lg },
  icon: { alignItems: 'center', borderRadius: radius.md, height: 42, justifyContent: 'center', width: 42 },
  categoryCopy: { flex: 1, gap: spacing.sm },
  categoryTop: { flexDirection: 'row', justifyContent: 'space-between' },
  categoryName: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  categoryAmount: { color: colors.inkMuted, fontSize: 12, fontWeight: '700' },
  divider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth, marginLeft: 54 },
  tipCard: { alignItems: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  tipText: { color: colors.primaryDark, flex: 1, fontSize: 13, lineHeight: 19 },
});
