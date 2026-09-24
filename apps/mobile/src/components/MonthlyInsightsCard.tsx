import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import type { Category } from '../types';
import { currentMonthStart, formatMonth } from '../utils/date';
import { formatMoney } from '../utils/money';

type MonthlyInsightsCardProps = {
  categories: Category[];
  currentMonthSpent: number;
  month: string;
  previousMonthSpent: number;
};

type Insight = {
  color: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  text: string;
};

export function MonthlyInsightsCard({ categories, currentMonthSpent, month, previousMonthSpent }: MonthlyInsightsCardProps) {
  const categorizedSpending = categories.reduce((sum, category) => sum + category.spent, 0);
  if (currentMonthSpent <= 0 && categorizedSpending <= 0) return null;

  const insights: Insight[] = [];
  const overspent = categories
    .filter((category) => category.budget > 0 && category.spent > category.budget)
    .sort((left, right) => (right.spent - right.budget) - (left.spent - left.budget))[0];
  if (overspent) {
    insights.push({
      color: colors.danger,
      icon: 'alert-circle-outline',
      text: `${overspent.name} is ${formatMoney(overspent.spent - overspent.budget)} over its plan.`,
    });
  }

  if (previousMonthSpent > 0) {
    const change = currentMonthSpent - previousMonthSpent;
    const percent = Math.round((Math.abs(change) / previousMonthSpent) * 100);
    const period = month === currentMonthStart() ? 'the same point last month' : 'the previous month';
    insights.push({
      color: change <= 0 ? colors.primary : '#C86B33',
      icon: change < 0 ? 'trending-down' : change > 0 ? 'trending-up' : 'minus',
      text: change === 0
        ? `Spending matches ${period}.`
        : `Spending is ${percent}% ${change < 0 ? 'lower' : 'higher'} than ${period}.`,
    });
  } else if (currentMonthSpent > 0) {
    insights.push({
      color: colors.primary,
      icon: 'chart-line',
      text: 'You’re building your first month of spending history.',
    });
  }

  const topCategory = [...categories]
    .filter((category) => category.spent > 0)
    .sort((left, right) => right.spent - left.spent)[0];
  if (topCategory) {
    insights.push({
      color: topCategory.color,
      icon: topCategory.icon as keyof typeof MaterialCommunityIcons.glyphMap,
      text: `${topCategory.name} is your largest category at ${formatMoney(topCategory.spent)}.`,
    });
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons color={colors.primaryDark} name="lightbulb-on-outline" size={21} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Monthly insights</Text>
          <Text style={styles.detail}>A quick read on {formatMonth(month, false)}</Text>
        </View>
      </View>
      <View style={styles.list}>
        {insights.slice(0, 3).map((insight, index) => (
          <View key={`${insight.text}-${index}`} style={styles.row}>
            <View style={[styles.insightIcon, { backgroundColor: `${insight.color}18` }]}>
              <MaterialCommunityIcons color={insight.color} name={insight.icon} size={18} />
            </View>
            <Text style={styles.insightText}>{insight.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, gap: spacing.lg, padding: spacing.lg },
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  headerIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 40, justifyContent: 'center', width: 40 },
  headerCopy: { flex: 1 },
  title: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  detail: { color: colors.inkMuted, fontSize: 11, marginTop: 2 },
  list: { gap: spacing.md },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  insightIcon: { alignItems: 'center', borderRadius: radius.pill, height: 34, justifyContent: 'center', width: 34 },
  insightText: { color: colors.ink, flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 17 },
});
