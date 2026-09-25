import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ProgressBar } from '../components/ProgressBar';
import { PlannedExpenseRow } from '../components/PlannedExpenseRow';
import { RecurringBillRow } from '../components/RecurringBillRow';
import { SavingsGoalRow } from '../components/SavingsGoalRow';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, radius, spacing } from '../theme';
import type { Category, IncomeSuggestion, PlannedExpense, RecurringBill, SavingsGoal, SubscriptionSuggestion } from '../types';
import { formatMonth, plannedExpenseMonthlySetAside, savingsGoalMonthlyAmount, shiftMonth } from '../utils/date';
import { formatMoney } from '../utils/money';

type PlanScreenProps = {
  canCopyPreviousPlan: boolean;
  categories: Category[];
  copyingPreviousPlan: boolean;
  income: number;
  incomeSuggestion?: IncomeSuggestion;
  incomeSuggestionAction?: 'accepted' | 'dismissed' | null;
  month: string;
  bills: number;
  plannedExpenses: PlannedExpense[];
  recurringBills: RecurringBill[];
  savingsGoals: SavingsGoal[];
  subscriptionSuggestions: SubscriptionSuggestion[];
  dismissingSuggestion?: string | null;
  onAddBill: () => void;
  onAddPlannedExpense: () => void;
  onAddSavingsGoal: () => void;
  onCopyPreviousPlan: () => void;
  onEdit: () => void;
  onEditBill: (bill: RecurringBill) => void;
  onEditPlannedExpense: (expense: PlannedExpense) => void;
  onEditSavingsGoal: (goal: SavingsGoal) => void;
  onManageCategories: () => void;
  onOpenCashFlow: () => void;
  onSelectMonth: () => void;
  onAddSubscriptionSuggestion: (suggestion: SubscriptionSuggestion) => void;
  onDismissSubscriptionSuggestion: (suggestion: SubscriptionSuggestion) => void;
  onDismissIncomeSuggestion: (suggestion: IncomeSuggestion) => void;
  onUseIncomeSuggestion: (suggestion: IncomeSuggestion) => void;
  onToggleBillPaid: (bill: RecurringBill) => void;
  onTogglePlannedExpenseCovered: (expense: PlannedExpense) => void;
};

export function PlanScreen({
  canCopyPreviousPlan,
  categories,
  copyingPreviousPlan,
  income,
  incomeSuggestion,
  incomeSuggestionAction,
  month,
  bills,
  plannedExpenses,
  recurringBills,
  savingsGoals,
  subscriptionSuggestions,
  dismissingSuggestion,
  onAddBill,
  onAddPlannedExpense,
  onAddSavingsGoal,
  onCopyPreviousPlan,
  onEdit,
  onEditBill,
  onEditPlannedExpense,
  onEditSavingsGoal,
  onManageCategories,
  onOpenCashFlow,
  onSelectMonth,
  onAddSubscriptionSuggestion,
  onDismissSubscriptionSuggestion,
  onDismissIncomeSuggestion,
  onUseIncomeSuggestion,
  onToggleBillPaid,
  onTogglePlannedExpenseCovered,
}: PlanScreenProps) {
  const flexibleBudget = categories.reduce((sum, category) => sum + category.budget, 0);
  const plannedSetAside = plannedExpenses
    .filter((expense) => !expense.covered)
    .reduce((sum, expense) => sum + plannedExpenseMonthlySetAside(expense, month), 0);
  const goalSetAside = savingsGoals.reduce((sum, goal) => (
    sum + savingsGoalMonthlyAmount(goal.targetAmount, goal.currentAmount, goal.targetMonth, month)
  ), 0);
  const totalGoalSaved = savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const totalGoalTarget = savingsGoals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const planned = bills + flexibleBudget + plannedSetAside + goalSetAside;
  const buffer = income - planned;
  const plannedRatio = income > 0 ? Math.min(planned / income, 1) : 0;
  const recurringTotal = recurringBills.reduce((sum, bill) => sum + bill.amount, 0);
  const paidCount = recurringBills.filter((bill) => bill.paid).length;
  const previousMonth = formatMonth(shiftMonth(month, -1), false);
  const incomeCadence = incomeSuggestion?.cadence === 'weekly'
    ? 'paid weekly'
    : incomeSuggestion?.cadence === 'biweekly'
      ? 'paid about every two weeks'
      : incomeSuggestion?.cadence === 'monthly'
        ? 'paid monthly'
        : `${incomeSuggestion?.sourceCount ?? 0} recurring sources`;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View>
          <ScreenHeader detail="Give every dollar a simple job." title="Monthly plan" />
          <Pressable accessibilityLabel="Choose plan month" onPress={onSelectMonth} style={styles.monthPicker}>
            <MaterialCommunityIcons color={colors.primary} name="calendar-month-outline" size={15} />
            <Text style={styles.monthText}>{formatMonth(month)}</Text>
            <MaterialCommunityIcons color={colors.primary} name="chevron-down" size={16} />
          </Pressable>
        </View>
        <Pressable accessibilityLabel="Edit monthly plan" onPress={onEdit} style={styles.editButton}>
          <MaterialCommunityIcons color={colors.primaryDark} name="pencil-outline" size={19} />
          <Text style={styles.editText}>Edit</Text>
        </Pressable>
      </View>

      {canCopyPreviousPlan ? (
        <View style={styles.copyCard}>
          <View style={styles.copyIcon}>
            <MaterialCommunityIcons color={colors.primaryDark} name="content-copy" size={23} />
          </View>
          <View style={styles.copyTextBlock}>
            <Text style={styles.copyTitle}>Start with {previousMonth}’s plan</Text>
            <Text style={styles.copyDetail}>Copy income, fixed costs, and category limits. You can adjust anything afterward.</Text>
          </View>
          <Pressable
            accessibilityLabel={`Copy ${previousMonth}'s plan`}
            disabled={copyingPreviousPlan}
            onPress={onCopyPreviousPlan}
            style={[styles.copyButton, copyingPreviousPlan && styles.copyButtonDisabled]}
          >
            {copyingPreviousPlan
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={styles.copyButtonText}>Copy</Text>}
          </Pressable>
        </View>
      ) : null}

      {incomeSuggestion ? (
        <View style={styles.incomeSuggestionCard}>
          <View style={styles.incomeSuggestionIcon}>
            <MaterialCommunityIcons color={colors.primaryDark} name="bank-check" size={23} />
          </View>
          <View style={styles.incomeSuggestionCopy}>
            <Text style={styles.incomeSuggestionEyebrow}>PLAID INCOME ESTIMATE</Text>
            <Text style={styles.incomeSuggestionAmount}>{formatMoney(incomeSuggestion.monthlyAmount)}/month</Text>
            <Text numberOfLines={2} style={styles.incomeSuggestionDetail}>
              {incomeSuggestion.payerName} · {incomeCadence} · {incomeSuggestion.occurrenceCount} deposits reviewed
            </Text>
          </View>
          <View style={styles.incomeSuggestionActions}>
            <Pressable
              accessibilityLabel="Dismiss Plaid income estimate"
              disabled={Boolean(incomeSuggestionAction)}
              onPress={() => onDismissIncomeSuggestion(incomeSuggestion)}
              style={styles.incomeDismissButton}
            >
              {incomeSuggestionAction === 'dismissed'
                ? <ActivityIndicator color={colors.inkMuted} size="small" />
                : <MaterialCommunityIcons color={colors.inkMuted} name="close" size={19} />}
            </Pressable>
            <Pressable
              accessibilityLabel={`Use ${formatMoney(incomeSuggestion.monthlyAmount)} as expected monthly income`}
              disabled={Boolean(incomeSuggestionAction)}
              onPress={() => onUseIncomeSuggestion(incomeSuggestion)}
              style={styles.incomeUseButton}
            >
              {incomeSuggestionAction === 'accepted'
                ? <ActivityIndicator color={colors.white} size="small" />
                : <Text style={styles.incomeUseText}>Use estimate</Text>}
            </Pressable>
          </View>
        </View>
      ) : null}

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
          <View style={[styles.planTrackFill, { width: `${plannedRatio * 100}%` }]} />
        </View>
        <Text style={styles.planDetail}>{formatMoney(income)} expected income</Text>
      </View>

      <Pressable accessibilityLabel="Open cash flow report" onPress={onOpenCashFlow} style={styles.reportCard}>
        <View style={styles.reportIcon}>
          <MaterialCommunityIcons color={colors.primaryDark} name="chart-timeline-variant" size={24} />
        </View>
        <View style={styles.reportCopy}>
          <Text style={styles.reportTitle}>Cash-flow report</Text>
          <Text style={styles.reportDetail}>See what came in, went out, and remains available.</Text>
        </View>
        <MaterialCommunityIcons color={colors.inkMuted} name="chevron-right" size={22} />
      </Pressable>

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
        <View>
          <Text style={styles.sectionTitle}>Recurring bills</Text>
          <Text style={styles.sectionCaption}>
            {recurringBills.length ? `${paidCount} of ${recurringBills.length} paid · ${formatMoney(recurringTotal)} listed` : 'Keep due dates in one place'}
          </Text>
        </View>
        <Pressable accessibilityLabel="Add recurring bill" onPress={onAddBill} style={styles.addBillButton}>
          <MaterialCommunityIcons color={colors.primaryDark} name="plus" size={18} />
          <Text style={styles.addBillText}>Add</Text>
        </Pressable>
      </View>
      {recurringBills.length ? (
        <View style={styles.billList}>
          {recurringBills.map((bill, index) => (
            <View key={bill.id}>
              <RecurringBillRow
                bill={bill}
                month={month}
                onEdit={() => onEditBill(bill)}
                onTogglePaid={() => onToggleBillPaid(bill)}
              />
              {index < recurringBills.length - 1 ? <View style={styles.billDivider} /> : null}
            </View>
          ))}
        </View>
      ) : (
        <Pressable onPress={onAddBill} style={styles.emptyBills}>
          <View style={styles.emptyBillIcon}>
            <MaterialCommunityIcons color={colors.primary} name="calendar-plus" size={24} />
          </View>
          <View style={styles.emptyBillCopy}>
            <Text style={styles.emptyBillTitle}>Add your first monthly bill</Text>
            <Text style={styles.emptyBillDetail}>Track due dates and check bills off as you pay them.</Text>
          </View>
        </Pressable>
      )}

      {subscriptionSuggestions.length ? (
        <View style={styles.suggestionSection}>
          <View>
            <Text style={styles.suggestionTitle}>Possible subscriptions</Text>
            <Text style={styles.sectionCaption}>Repeating monthly charges Zenify found</Text>
          </View>
          <View style={styles.suggestionList}>
            {subscriptionSuggestions.map((suggestion, index) => {
              const dismissing = dismissingSuggestion === suggestion.merchantKey;
              return (
                <View key={suggestion.merchantKey}>
                  <View style={styles.suggestionRow}>
                    <View style={styles.suggestionIcon}>
                      <MaterialCommunityIcons color={colors.primary} name="autorenew" size={20} />
                    </View>
                    <View style={styles.suggestionCopy}>
                      <Text numberOfLines={1} style={styles.suggestionName}>{suggestion.merchantName}</Text>
                      <Text style={styles.suggestionDetail}>Seen {suggestion.occurrenceCount} times · about {formatMoney(suggestion.amount)}/month</Text>
                    </View>
                    <Pressable
                      accessibilityLabel={`Dismiss ${suggestion.merchantName} suggestion`}
                      disabled={dismissing}
                      onPress={() => onDismissSubscriptionSuggestion(suggestion)}
                      style={styles.dismissSuggestion}
                    >
                      {dismissing
                        ? <ActivityIndicator color={colors.inkMuted} size="small" />
                        : <MaterialCommunityIcons color={colors.inkMuted} name="close" size={19} />}
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Add ${suggestion.merchantName} as a recurring bill`}
                      onPress={() => onAddSubscriptionSuggestion(suggestion)}
                      style={styles.addSuggestion}
                    >
                      <Text style={styles.addSuggestionText}>Review</Text>
                    </Pressable>
                  </View>
                  {index < subscriptionSuggestions.length - 1 ? <View style={styles.suggestionDivider} /> : null}
                </View>
              );
            })}
          </View>
          <Text style={styles.suggestionFootnote}>Nothing is added automatically. You stay in control.</Text>
        </View>
      ) : null}

      <View style={styles.sectionTitleRow}>
        <View>
          <Text style={styles.sectionTitle}>Planned expenses</Text>
          <Text style={styles.sectionCaption}>
            {plannedExpenses.length ? `${formatMoney(plannedSetAside)} to set aside this month` : 'Prepare for one-time costs'}
          </Text>
        </View>
        <Pressable accessibilityLabel="Add planned expense" onPress={onAddPlannedExpense} style={styles.addBillButton}>
          <MaterialCommunityIcons color={colors.primaryDark} name="plus" size={18} />
          <Text style={styles.addBillText}>Add</Text>
        </Pressable>
      </View>
      {plannedExpenses.length ? (
        <View style={styles.billList}>
          {plannedExpenses.map((expense, index) => (
            <View key={expense.id}>
              <PlannedExpenseRow
                categories={categories}
                expense={expense}
                referenceMonth={month}
                onEdit={() => onEditPlannedExpense(expense)}
                onToggleCovered={() => onTogglePlannedExpenseCovered(expense)}
              />
              {index < plannedExpenses.length - 1 ? <View style={styles.billDivider} /> : null}
            </View>
          ))}
        </View>
      ) : (
        <Pressable onPress={onAddPlannedExpense} style={styles.emptyBills}>
          <View style={styles.emptyBillIcon}>
            <MaterialCommunityIcons color={colors.primary} name="calendar-star" size={24} />
          </View>
          <View style={styles.emptyBillCopy}>
            <Text style={styles.emptyBillTitle}>Plan a one-time expense</Text>
            <Text style={styles.emptyBillDetail}>Add a trip, repair, or purchase and see a simple monthly set-aside.</Text>
          </View>
        </Pressable>
      )}

      <View style={styles.sectionTitleRow}>
        <View>
          <Text style={styles.sectionTitle}>Savings goals</Text>
          <Text style={styles.sectionCaption}>
            {savingsGoals.length
              ? `${formatMoney(totalGoalSaved)} saved of ${formatMoney(totalGoalTarget)} · ${formatMoney(goalSetAside)}/month pace`
              : 'Turn long-term plans into a monthly pace'}
          </Text>
        </View>
        <Pressable accessibilityLabel="Add savings goal" onPress={onAddSavingsGoal} style={styles.addBillButton}>
          <MaterialCommunityIcons color={colors.primaryDark} name="plus" size={18} />
          <Text style={styles.addBillText}>Add</Text>
        </Pressable>
      </View>
      {savingsGoals.length ? (
        <View style={styles.billList}>
          {savingsGoals.map((goal, index) => (
            <View key={goal.id}>
              <SavingsGoalRow goal={goal} referenceMonth={month} onEdit={() => onEditSavingsGoal(goal)} />
              {index < savingsGoals.length - 1 ? <View style={styles.billDivider} /> : null}
            </View>
          ))}
        </View>
      ) : (
        <Pressable onPress={onAddSavingsGoal} style={styles.emptyBills}>
          <View style={styles.emptyBillIcon}>
            <MaterialCommunityIcons color={colors.primary} name="piggy-bank-outline" size={24} />
          </View>
          <View style={styles.emptyBillCopy}>
            <Text style={styles.emptyBillTitle}>Create your first savings goal</Text>
            <Text style={styles.emptyBillDetail}>Set a target and Zenify will show a simple monthly pace.</Text>
          </View>
        </Pressable>
      )}

      <View style={styles.sectionTitleRow}>
        <View>
          <Text style={styles.sectionTitle}>Flexible spending</Text>
          <Text style={styles.sectionCaption}>{formatMoney(flexibleBudget)} planned</Text>
        </View>
        <Pressable accessibilityLabel="Manage spending categories" onPress={onManageCategories} style={styles.addBillButton}>
          <MaterialCommunityIcons color={colors.primaryDark} name="shape-outline" size={17} />
          <Text style={styles.addBillText}>Manage</Text>
        </Pressable>
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
                {category.subcategories.length ? <Text style={styles.categoryDetail}>{category.subcategories.map((item) => item.name).join(' · ')}</Text> : null}
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
  headerRow: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  monthPicker: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 4, marginTop: spacing.sm },
  monthText: { color: colors.primaryDark, fontSize: 12, fontWeight: '800' },
  copyCard: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  copyIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, height: 44, justifyContent: 'center', width: 44 },
  copyTextBlock: { flex: 1 },
  copyTitle: { color: colors.primaryDark, fontSize: 14, fontWeight: '800' },
  copyDetail: { color: colors.primaryDark, fontSize: 10, lineHeight: 15, marginTop: 3, opacity: 0.8 },
  copyButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.pill, minWidth: 66, paddingHorizontal: 14, paddingVertical: 10 },
  copyButtonDisabled: { opacity: 0.55 },
  copyButtonText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  editButton: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.pill, flexDirection: 'row', gap: 5, marginTop: spacing.sm, paddingHorizontal: 12, paddingVertical: 9 },
  editText: { color: colors.primaryDark, fontSize: 12, fontWeight: '800' },
  planCard: { backgroundColor: colors.primaryDark, borderRadius: radius.lg, gap: spacing.lg, padding: spacing.xl },
  planTop: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: '#BFD8C9', fontSize: 12, fontWeight: '700' },
  planValue: { color: colors.white, fontSize: 32, fontWeight: '800', marginTop: spacing.xs },
  bufferBlock: { alignItems: 'flex-end' },
  bufferValue: { color: '#93E0AD', fontSize: 20, fontWeight: '800', marginTop: spacing.xs },
  planTrack: { backgroundColor: '#FFFFFF1F', borderRadius: radius.pill, height: 10, overflow: 'hidden' },
  planTrackFill: { backgroundColor: colors.accent, borderRadius: radius.pill, height: '100%' },
  planDetail: { color: '#BFD8C9', fontSize: 12 },
  incomeSuggestionCard: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, padding: spacing.lg },
  incomeSuggestionIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.pill, height: 44, justifyContent: 'center', width: 44 },
  incomeSuggestionCopy: { flex: 1, minWidth: 190 },
  incomeSuggestionEyebrow: { color: colors.primary, fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  incomeSuggestionAmount: { color: colors.primaryDark, fontSize: 19, fontWeight: '800', marginTop: 2 },
  incomeSuggestionDetail: { color: colors.inkMuted, fontSize: 10, lineHeight: 15, marginTop: 2 },
  incomeSuggestionActions: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs, marginLeft: 'auto' },
  incomeDismissButton: { alignItems: 'center', height: 36, justifyContent: 'center', width: 32 },
  incomeUseButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.pill, minWidth: 92, paddingHorizontal: 12, paddingVertical: 10 },
  incomeUseText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  reportCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  reportIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 48, justifyContent: 'center', width: 48 },
  reportCopy: { flex: 1, gap: 3 },
  reportTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  reportDetail: { color: colors.inkMuted, fontSize: 11, lineHeight: 16 },
  sectionTitleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: -spacing.md },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  sectionCaption: { color: colors.inkMuted, fontSize: 11, marginTop: 3 },
  sectionValue: { color: colors.inkMuted, fontSize: 14, fontWeight: '800' },
  fixedCard: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  fixedIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 48, justifyContent: 'center', width: 48 },
  fixedCopy: { flex: 1, gap: 3 },
  fixedTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  fixedDetail: { color: colors.inkMuted, fontSize: 12, lineHeight: 17 },
  addBillButton: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.pill, flexDirection: 'row', gap: 3, paddingHorizontal: 11, paddingVertical: 8 },
  addBillText: { color: colors.primaryDark, fontSize: 12, fontWeight: '800' },
  billList: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.lg },
  billDivider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth, marginLeft: 38 },
  emptyBills: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderStyle: 'dashed', borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  emptyBillIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 46, justifyContent: 'center', width: 46 },
  emptyBillCopy: { flex: 1, gap: 3 },
  emptyBillTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  emptyBillDetail: { color: colors.inkMuted, fontSize: 11, lineHeight: 16 },
  suggestionSection: { gap: spacing.md },
  suggestionTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  suggestionList: { backgroundColor: colors.primarySoft, borderRadius: radius.md, paddingHorizontal: spacing.md },
  suggestionRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 68, paddingVertical: spacing.md },
  suggestionIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.pill, height: 36, justifyContent: 'center', width: 36 },
  suggestionCopy: { flex: 1 },
  suggestionName: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  suggestionDetail: { color: colors.inkMuted, fontSize: 10, lineHeight: 15, marginTop: 2 },
  dismissSuggestion: { alignItems: 'center', height: 34, justifyContent: 'center', width: 30 },
  addSuggestion: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 9 },
  addSuggestionText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  suggestionDivider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth, marginLeft: 44 },
  suggestionFootnote: { color: colors.inkMuted, fontSize: 10, lineHeight: 15 },
  categoryList: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.lg },
  categoryRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.lg },
  icon: { alignItems: 'center', borderRadius: radius.md, height: 42, justifyContent: 'center', width: 42 },
  categoryCopy: { flex: 1, gap: spacing.sm },
  categoryTop: { flexDirection: 'row', justifyContent: 'space-between' },
  categoryName: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  categoryDetail: { color: colors.inkMuted, fontSize: 10, lineHeight: 14 },
  categoryAmount: { color: colors.inkMuted, fontSize: 12, fontWeight: '700' },
  divider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth, marginLeft: 54 },
  tipCard: { alignItems: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  tipText: { color: colors.primaryDark, flex: 1, fontSize: 13, lineHeight: 19 },
});
