import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import type { PropsWithChildren } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { AddTransactionModal } from './src/components/AddTransactionModal';
import { BottomNav } from './src/components/BottomNav';
import { CashFlowReportModal } from './src/components/CashFlowReportModal';
import { CategoryManagerModal } from './src/components/CategoryManagerModal';
import { PlannedExpenseModal } from './src/components/PlannedExpenseModal';
import { RecurringBillModal } from './src/components/RecurringBillModal';
import { ReviewTransactionModal } from './src/components/ReviewTransactionModal';
import { SavingsGoalModal } from './src/components/SavingsGoalModal';
import {
  categorizeTransaction,
  createCategory as createBudgetCategory,
  createManualTransaction,
  createPlannedExpense,
  createRecurringBill,
  createSavingsGoal,
  createSavingsGoalContribution,
  createSubcategory,
  deleteMerchantRule,
  deleteManualTransaction,
  deletePlannedExpense,
  deleteRecurringBill,
  deleteSavingsGoal,
  deleteSavingsGoalContribution,
  exportCloudBudget,
  importManualTransactions,
  loadCloudBudget,
  loadMerchantRules,
  saveMonthlyPlan,
  setPlannedExpenseCovered,
  setRecurringBillPaid,
  updateManualTransaction,
  updatePlannedExpense,
  updateCategory as updateBudgetCategory,
  updateRecurringBill,
  updateSavingsGoal,
  updateSubcategory,
} from './src/data/budgetRepository';
import { accounts, initialCategories, initialPlannedExpenses, initialRecurringBills, initialSavingsGoals, initialTransactions, monthlyBills, monthlyIncome, previousMonthToDateSpent as demoPreviousMonthToDateSpent } from './src/data/demo';
import { isCloudConfigured, supabase } from './src/lib/supabase';
import { AccountScreen } from './src/screens/AccountScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { ConnectScreen } from './src/screens/ConnectScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoadingScreen } from './src/screens/LoadingScreen';
import { PlanScreen } from './src/screens/PlanScreen';
import { PlanSetupScreen } from './src/screens/PlanSetupScreen';
import { TransactionsScreen } from './src/screens/TransactionsScreen';
import { UpdatePasswordScreen } from './src/screens/UpdatePasswordScreen';
import { colors } from './src/theme';
import type { AppTab, Category, CategoryDraft, ImportedTransactionDraft, ManualTransactionDraft, MerchantRule, PlannedExpense, PlannedExpenseDraft, RecurringBill, RecurringBillDraft, SavingsGoal, SavingsGoalContribution, SavingsGoalContributionDraft, SavingsGoalDraft, Subcategory, Transaction } from './src/types';
import { formatActivityDate } from './src/utils/date';
import { formatMoney } from './src/utils/money';
import { useReducedMotion } from './src/utils/useReducedMotion';

const tabOrder: AppTab[] = ['home', 'transactions', 'plan', 'connect'];

type TabTransitionProps = PropsWithChildren<{
  direction: -1 | 1;
}>;

function TabTransition({ children, direction }: TabTransitionProps) {
  const reduceMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0.78)).current;
  const translateX = useRef(new Animated.Value(direction * 14)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      translateX.setValue(0);
      return undefined;
    }

    const animation = Animated.parallel([
      Animated.timing(opacity, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(translateX, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [opacity, reduceMotion, translateX]);

  return (
    <Animated.View style={[styles.app, { opacity, transform: [{ translateX }] }]} testID="tab-transition">
      {children}
    </Animated.View>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(isCloudConfigured);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (authLoading) return <LoadingScreen />;
  if (isCloudConfigured && !session) return <AuthScreen />;
  if (isCloudConfigured && session && passwordRecovery) {
    return <UpdatePasswordScreen onComplete={() => setPasswordRecovery(false)} />;
  }

  return <BudgetApp session={session} />;
}

type BudgetAppProps = { session: Session | null };

function BudgetApp({ session }: BudgetAppProps) {
  const cloudMode = Boolean(session);
  const forcePlanPreview = process.env.EXPO_PUBLIC_FORCE_PLAN_SETUP === 'true';
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [transitionDirection, setTransitionDirection] = useState<-1 | 1>(1);
  const [transactions, setTransactions] = useState<Transaction[]>(cloudMode ? [] : initialTransactions);
  const [categories, setCategories] = useState(cloudMode ? [] : initialCategories);
  const [connectedAccounts, setConnectedAccounts] = useState(cloudMode ? [] : accounts);
  const [income, setIncome] = useState(cloudMode ? 0 : monthlyIncome);
  const [bills, setBills] = useState(cloudMode ? 0 : monthlyBills);
  const [previousMonthToDateSpent, setPreviousMonthToDateSpent] = useState(cloudMode ? 0 : demoPreviousMonthToDateSpent);
  const [merchantRules, setMerchantRules] = useState<MerchantRule[]>([]);
  const [plannedExpenses, setPlannedExpenses] = useState<PlannedExpense[]>(cloudMode ? [] : initialPlannedExpenses);
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>(cloudMode ? [] : initialRecurringBills);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(cloudMode ? [] : initialSavingsGoals);
  const [dataLoading, setDataLoading] = useState(cloudMode);
  const [dataError, setDataError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [planEditing, setPlanEditing] = useState(forcePlanPreview);
  const [billOpen, setBillOpen] = useState(false);
  const [billSaving, setBillSaving] = useState(false);
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null);
  const [plannedExpenseOpen, setPlannedExpenseOpen] = useState(false);
  const [plannedExpenseSaving, setPlannedExpenseSaving] = useState(false);
  const [editingPlannedExpense, setEditingPlannedExpense] = useState<PlannedExpense | null>(null);
  const [savingsGoalOpen, setSavingsGoalOpen] = useState(false);
  const [savingsGoalSaving, setSavingsGoalSaving] = useState(false);
  const [savingsContributionSaving, setSavingsContributionSaving] = useState(false);
  const [editingSavingsGoal, setEditingSavingsGoal] = useState<SavingsGoal | null>(null);
  const [cashFlowOpen, setCashFlowOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [reviewTransaction, setReviewTransaction] = useState<Transaction | null>(null);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewDeleting, setReviewDeleting] = useState(false);

  const changeTab = useCallback((nextTab: AppTab) => {
    if (nextTab === activeTab) return;
    setTransitionDirection(tabOrder.indexOf(nextTab) > tabOrder.indexOf(activeTab) ? 1 : -1);
    setActiveTab(nextTab);
  }, [activeTab]);

  const refreshCloudData = useCallback(async () => {
    if (!session) return;
    setDataLoading(true);
    setDataError(null);
    try {
      const data = await loadCloudBudget();
      setTransactions(data.transactions);
      setCategories(data.categories);
      setConnectedAccounts(data.accounts);
      setIncome(data.income);
      setBills(data.bills);
      setPreviousMonthToDateSpent(data.previousMonthToDateSpent);
      setMerchantRules(data.merchantRules);
      setPlannedExpenses(data.plannedExpenses);
      setRecurringBills(data.recurringBills);
      setSavingsGoals(data.savingsGoals);
    } catch (caught) {
      setDataError(caught instanceof Error ? caught.message : 'Your cloud budget could not be loaded.');
    } finally {
      setDataLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void refreshCloudData();
  }, [refreshCloudData]);

  const saveTransaction = async (draft: ManualTransactionDraft) => {
    let transaction: Transaction;
    setAddSaving(true);
    try {
      if (editingTransaction) {
        transaction = session
          ? await updateManualTransaction(editingTransaction.id, draft)
          : {
              ...editingTransaction,
              merchant: draft.merchant,
              amount: draft.amount,
              categoryId: draft.categoryId,
              subcategoryId: draft.subcategoryId,
              direction: draft.direction,
              date: formatActivityDate(draft.transactionDate),
              note: draft.note || undefined,
              source: 'manual',
              transactionDate: draft.transactionDate,
            };
      } else {
        transaction = session
          ? await createManualTransaction(draft)
          : {
              id: `manual-${Date.now()}`,
              merchant: draft.merchant,
              amount: draft.amount,
              categoryId: draft.categoryId,
              subcategoryId: draft.subcategoryId,
              direction: draft.direction,
              date: formatActivityDate(draft.transactionDate),
              account: 'Manual entry',
              note: draft.note || undefined,
              source: 'manual',
              transactionDate: draft.transactionDate,
            };
      }
    } catch (caught) {
      Alert.alert('Could not save transaction', caught instanceof Error ? caught.message : 'Please try again.');
      return;
    } finally {
      setAddSaving(false);
    }

    if (editingTransaction) {
      const previous = editingTransaction;
      setTransactions((current) => current.map((item) => (item.id === transaction.id ? transaction : item)));
      setCategories((current) => current.map((category) => {
        let spent = category.spent;
        if ((previous.direction ?? 'outflow') === 'outflow' && category.id === previous.categoryId) {
          spent = Math.max(0, spent - previous.amount);
        }
        if (draft.direction === 'outflow' && category.id === draft.categoryId) {
          spent += draft.amount;
        }
        return spent === category.spent ? category : { ...category, spent };
      }));
    } else {
      setTransactions((current) => [transaction, ...current]);
      if (draft.direction === 'outflow') {
        setCategories((current) => current.map((category) => (
          category.id === draft.categoryId
            ? { ...category, spent: category.spent + draft.amount }
            : category
        )));
      }
    }
    setEditingTransaction(null);
    setAddOpen(false);
  };

  const openTransactionEntry = () => {
    setEditingTransaction(null);
    setAddOpen(true);
  };

  const editReviewedTransaction = () => {
    if (reviewTransaction?.source !== 'manual') return;
    setEditingTransaction(reviewTransaction);
    setReviewTransaction(null);
    setAddOpen(true);
  };

  const performDeleteReviewedTransaction = async (transaction: Transaction) => {
    setReviewDeleting(true);
    try {
      if (session) await deleteManualTransaction(transaction.id);
      setTransactions((current) => current.filter((item) => item.id !== transaction.id));
      if ((transaction.direction ?? 'outflow') === 'outflow') {
        setCategories((current) => current.map((category) => (
          category.id === transaction.categoryId
            ? { ...category, spent: Math.max(0, category.spent - transaction.amount) }
            : category
        )));
      }
      setReviewTransaction(null);
    } catch (caught) {
      Alert.alert('Could not delete transaction', caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setReviewDeleting(false);
    }
  };

  const confirmDeleteReviewedTransaction = () => {
    const transaction = reviewTransaction;
    if (!transaction || transaction.source !== 'manual') return;
    Alert.alert(
      'Delete this transaction?',
      `${transaction.merchant} will be permanently removed from your budget.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { void performDeleteReviewedTransaction(transaction); } },
      ],
    );
  };

  const savePlan = async (input: { bills: number; categoryBudgets: Record<string, number>; income: number }) => {
    if (!session) return;
    await saveMonthlyPlan({
      bills: input.bills,
      categories: categories.map((category) => ({ id: category.id, budget: input.categoryBudgets[category.id] ?? 0 })),
      income: input.income,
      userId: session.user.id,
    });
    setBills(input.bills);
    setIncome(input.income);
    setCategories((current) => current.map((category) => ({ ...category, budget: input.categoryBudgets[category.id] ?? 0 })));
    setPlanEditing(false);
  };

  const openRecurringBill = (bill?: RecurringBill) => {
    setEditingBill(bill ?? null);
    setBillOpen(true);
  };

  const saveRecurringBill = async (draft: RecurringBillDraft) => {
    setBillSaving(true);
    try {
      if (editingBill) {
        const saved = session
          ? await updateRecurringBill(editingBill.id, draft)
          : { id: editingBill.id, ...draft };
        setRecurringBills((current) => current
          .map((bill) => (bill.id === editingBill.id ? { ...bill, ...saved } : bill))
          .sort((left, right) => left.dueDay - right.dueDay || left.name.localeCompare(right.name)));
      } else {
        const saved = session
          ? await createRecurringBill(draft)
          : { id: `bill-${Date.now()}`, ...draft, paid: false } satisfies RecurringBill;
        setRecurringBills((current) => [...current, saved]
          .sort((left, right) => left.dueDay - right.dueDay || left.name.localeCompare(right.name)));
      }
      setBillOpen(false);
      setEditingBill(null);
    } catch (caught) {
      Alert.alert('Could not save recurring bill', caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setBillSaving(false);
    }
  };

  const toggleRecurringBillPaid = async (bill: RecurringBill) => {
    const nextPaid = !bill.paid;
    try {
      const paidAt = session ? await setRecurringBillPaid(bill.id, nextPaid) : nextPaid ? new Date().toISOString() : undefined;
      setRecurringBills((current) => current.map((item) => (
        item.id === bill.id ? { ...item, paid: nextPaid, paidAt } : item
      )));
    } catch (caught) {
      Alert.alert('Could not update bill', caught instanceof Error ? caught.message : 'Please try again.');
    }
  };

  const performDeleteRecurringBill = async (bill: RecurringBill) => {
    setBillSaving(true);
    try {
      if (session) await deleteRecurringBill(bill.id);
      setRecurringBills((current) => current.filter((item) => item.id !== bill.id));
      setBillOpen(false);
      setEditingBill(null);
    } catch (caught) {
      Alert.alert('Could not delete recurring bill', caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setBillSaving(false);
    }
  };

  const confirmDeleteRecurringBill = () => {
    const bill = editingBill;
    if (!bill) return;
    Alert.alert(
      'Delete this recurring bill?',
      `${bill.name} and its payment history will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { void performDeleteRecurringBill(bill); } },
      ],
    );
  };

  const sortPlannedExpenses = (items: PlannedExpense[]) => [...items].sort((left, right) => (
    Number(left.covered) - Number(right.covered)
    || left.targetMonth.localeCompare(right.targetMonth)
    || left.name.localeCompare(right.name)
  ));

  const openPlannedExpense = (expense?: PlannedExpense) => {
    setEditingPlannedExpense(expense ?? null);
    setPlannedExpenseOpen(true);
  };

  const savePlannedExpense = async (draft: PlannedExpenseDraft) => {
    setPlannedExpenseSaving(true);
    try {
      if (editingPlannedExpense) {
        const saved = session
          ? await updatePlannedExpense(editingPlannedExpense.id, draft)
          : { ...editingPlannedExpense, ...draft };
        setPlannedExpenses((current) => sortPlannedExpenses(current.map((expense) => (
          expense.id === editingPlannedExpense.id ? saved : expense
        ))));
      } else {
        const saved = session
          ? await createPlannedExpense(draft)
          : { id: `planned-${Date.now()}`, ...draft, covered: false } satisfies PlannedExpense;
        setPlannedExpenses((current) => sortPlannedExpenses([...current, saved]));
      }
      setPlannedExpenseOpen(false);
      setEditingPlannedExpense(null);
    } catch (caught) {
      Alert.alert('Could not save planned expense', caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setPlannedExpenseSaving(false);
    }
  };

  const togglePlannedExpenseCovered = async (expense: PlannedExpense) => {
    try {
      const saved = session
        ? await setPlannedExpenseCovered(expense.id, !expense.covered)
        : {
            ...expense,
            covered: !expense.covered,
            coveredAt: !expense.covered ? new Date().toISOString() : undefined,
          };
      setPlannedExpenses((current) => sortPlannedExpenses(current.map((item) => item.id === expense.id ? saved : item)));
    } catch (caught) {
      Alert.alert('Could not update planned expense', caught instanceof Error ? caught.message : 'Please try again.');
    }
  };

  const performDeletePlannedExpense = async (expense: PlannedExpense) => {
    setPlannedExpenseSaving(true);
    try {
      if (session) await deletePlannedExpense(expense.id);
      setPlannedExpenses((current) => current.filter((item) => item.id !== expense.id));
      setPlannedExpenseOpen(false);
      setEditingPlannedExpense(null);
    } catch (caught) {
      Alert.alert('Could not delete planned expense', caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setPlannedExpenseSaving(false);
    }
  };

  const confirmDeletePlannedExpense = () => {
    const expense = editingPlannedExpense;
    if (!expense) return;
    Alert.alert(
      'Delete this planned expense?',
      `${expense.name} will be permanently removed from your plan.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { void performDeletePlannedExpense(expense); } },
      ],
    );
  };

  const sortSavingsGoals = (items: SavingsGoal[]) => [...items].sort((left, right) => (
    Number(left.currentAmount >= left.targetAmount) - Number(right.currentAmount >= right.targetAmount)
    || left.targetMonth.localeCompare(right.targetMonth)
    || left.name.localeCompare(right.name)
  ));

  const openSavingsGoal = (goal?: SavingsGoal) => {
    setEditingSavingsGoal(goal ?? null);
    setSavingsGoalOpen(true);
  };

  const saveSavingsGoal = async (draft: SavingsGoalDraft) => {
    setSavingsGoalSaving(true);
    try {
      if (editingSavingsGoal) {
        const saved = session
          ? await updateSavingsGoal(editingSavingsGoal.id, draft)
          : {
              ...editingSavingsGoal,
              ...draft,
              currentAmount: draft.startingAmount + editingSavingsGoal.contributions.reduce((sum, contribution) => sum + contribution.amount, 0),
            };
        setSavingsGoals((current) => sortSavingsGoals(current.map((goal) => (
          goal.id === editingSavingsGoal.id ? saved : goal
        ))));
      } else {
        const saved = session
          ? await createSavingsGoal(draft)
          : {
              id: `goal-${Date.now()}`,
              ...draft,
              currentAmount: draft.startingAmount,
              contributions: [],
            } satisfies SavingsGoal;
        setSavingsGoals((current) => sortSavingsGoals([...current, saved]));
      }
      setSavingsGoalOpen(false);
      setEditingSavingsGoal(null);
    } catch (caught) {
      Alert.alert('Could not save savings goal', caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setSavingsGoalSaving(false);
    }
  };

  const saveSavingsGoalContribution = async (draft: SavingsGoalContributionDraft) => {
    const goal = editingSavingsGoal;
    if (!goal) return false;
    setSavingsContributionSaving(true);
    try {
      const contribution = session
        ? await createSavingsGoalContribution(goal.id, draft)
        : {
            id: `goal-contribution-${Date.now()}`,
            savingsGoalId: goal.id,
            amount: draft.amount,
            note: draft.note || undefined,
            contributedOn: draft.contributedOn,
            createdAt: new Date().toISOString(),
          } satisfies SavingsGoalContribution;
      const updatedGoal: SavingsGoal = {
        ...goal,
        currentAmount: goal.currentAmount + contribution.amount,
        contributions: [contribution, ...goal.contributions],
      };
      setSavingsGoals((current) => sortSavingsGoals(current.map((item) => item.id === goal.id ? updatedGoal : item)));
      setEditingSavingsGoal(updatedGoal);
      return true;
    } catch (caught) {
      Alert.alert('Could not add contribution', caught instanceof Error ? caught.message : 'Please try again.');
      return false;
    } finally {
      setSavingsContributionSaving(false);
    }
  };

  const performDeleteSavingsGoalContribution = async (contribution: SavingsGoalContribution) => {
    const goal = editingSavingsGoal;
    if (!goal) return;
    setSavingsContributionSaving(true);
    try {
      if (session) await deleteSavingsGoalContribution(contribution.id);
      const updatedGoal: SavingsGoal = {
        ...goal,
        currentAmount: Math.max(goal.startingAmount, goal.currentAmount - contribution.amount),
        contributions: goal.contributions.filter((item) => item.id !== contribution.id),
      };
      setSavingsGoals((current) => sortSavingsGoals(current.map((item) => item.id === goal.id ? updatedGoal : item)));
      setEditingSavingsGoal(updatedGoal);
    } catch (caught) {
      Alert.alert('Could not delete contribution', caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setSavingsContributionSaving(false);
    }
  };

  const confirmDeleteSavingsGoalContribution = (contribution: SavingsGoalContribution) => {
    Alert.alert(
      'Delete this contribution?',
      `${formatMoney(contribution.amount)} will be removed from ${editingSavingsGoal?.name ?? 'this goal'}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { void performDeleteSavingsGoalContribution(contribution); } },
      ],
    );
  };

  const performDeleteSavingsGoal = async (goal: SavingsGoal) => {
    setSavingsGoalSaving(true);
    try {
      if (session) await deleteSavingsGoal(goal.id);
      setSavingsGoals((current) => current.filter((item) => item.id !== goal.id));
      setSavingsGoalOpen(false);
      setEditingSavingsGoal(null);
    } catch (caught) {
      Alert.alert('Could not delete savings goal', caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setSavingsGoalSaving(false);
    }
  };

  const confirmDeleteSavingsGoal = () => {
    const goal = editingSavingsGoal;
    if (!goal) return;
    Alert.alert(
      'Delete this savings goal?',
      `${goal.name}, its saved progress, and its contribution history will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { void performDeleteSavingsGoal(goal); } },
      ],
    );
  };

  const saveTransactionCategory = async (categoryId: string, subcategoryId?: string, rememberMerchant = false) => {
    if (!reviewTransaction) return;
    setReviewSaving(true);
    try {
      if (session) {
        await categorizeTransaction(reviewTransaction.id, categoryId, subcategoryId, rememberMerchant);
        try {
          setMerchantRules(await loadMerchantRules());
        } catch {
          // The category is saved even if the non-critical rule count refresh fails.
        }
      }

      const previousCategoryId = reviewTransaction.categoryId;
      const affectsSpending = reviewTransaction.direction !== 'inflow';
      setTransactions((current) => current.map((transaction) => (
        transaction.id === reviewTransaction.id
          ? { ...transaction, categoryId, subcategoryId, needsReview: false }
          : transaction
      )));
      if (affectsSpending && previousCategoryId !== categoryId) {
        setCategories((current) => current.map((category) => {
          if (category.id === previousCategoryId) {
            return { ...category, spent: Math.max(0, category.spent - reviewTransaction.amount) };
          }
          if (category.id === categoryId) {
            return { ...category, spent: category.spent + reviewTransaction.amount };
          }
          return category;
        }));
      }
      setReviewTransaction(null);
    } catch (caught) {
      Alert.alert('Could not update category', caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setReviewSaving(false);
    }
  };

  const saveCategory = async (category: Category | null, draft: CategoryDraft) => {
    if (category) {
      if (session) await updateBudgetCategory(category.id, draft);
      setCategories((current) => current.map((item) => item.id === category.id ? { ...item, ...draft } : item));
      return;
    }

    const created = session
      ? await createBudgetCategory(draft, (categories.length + 1) * 10)
      : { id: `category-${Date.now()}`, ...draft, budget: 0, spent: 0, subcategories: [] } satisfies Category;
    setCategories((current) => [...current, created]);
  };

  const saveSubcategory = async (categoryId: string, name: string, subcategory?: Subcategory) => {
    if (subcategory) {
      const saved = session ? await updateSubcategory(subcategory.id, name) : { ...subcategory, name };
      setCategories((current) => current.map((category) => category.id === categoryId
        ? { ...category, subcategories: category.subcategories.map((item) => item.id === subcategory.id ? saved : item) }
        : category));
      return;
    }

    const parent = categories.find((category) => category.id === categoryId);
    const saved = session
      ? await createSubcategory(categoryId, name, ((parent?.subcategories.length ?? 0) + 1) * 10)
      : { id: `subcategory-${Date.now()}`, categoryId, name };
    setCategories((current) => current.map((category) => category.id === categoryId
      ? { ...category, subcategories: [...category.subcategories, saved] }
      : category));
  };

  const email = session?.user.email ?? '';
  const accountName = String(
    session?.user.user_metadata.full_name
    ?? session?.user.user_metadata.name
    ?? '',
  ).trim();
  const emailName = (email.split('@')[0] ?? '')
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
  const displayName = accountName || emailName || 'Friend';
  const firstName = displayName.split(/\s+/)[0] ?? 'Friend';
  const nameParts = displayName.split(/\s+/).filter(Boolean);
  const userInitials = nameParts.length > 1
    ? `${nameParts[0]?.charAt(0)}${nameParts[nameParts.length - 1]?.charAt(0)}`.toUpperCase()
    : displayName.slice(0, 2).toUpperCase();
  const openProfile = () => {
    if (!session || !supabase) {
      Alert.alert('Preview mode', 'Cloud accounts will appear here after Supabase is connected.');
      return;
    }
    setAccountOpen(true);
    void loadMerchantRules().then(setMerchantRules).catch(() => undefined);
  };

  const removeMerchantRule = async (ruleId: string) => {
    await deleteMerchantRule(ruleId);
    setMerchantRules((current) => current.filter((rule) => rule.id !== ruleId));
  };

  const importSpreadsheetTransactions = async (drafts: ImportedTransactionDraft[]) => {
    if (!drafts.length) return 0;
    const imported = session
      ? await importManualTransactions(drafts)
      : drafts.map((draft, index) => ({
          id: `csv-${Date.now()}-${index}`,
          merchant: draft.merchant,
          amount: draft.amount,
          categoryId: draft.categoryId,
          subcategoryId: draft.subcategoryId,
          direction: draft.direction,
          needsReview: draft.needsReview,
          date: formatActivityDate(draft.transactionDate),
          account: 'Manual entry',
          note: draft.note || undefined,
          source: 'manual' as const,
          transactionDate: draft.transactionDate,
        } satisfies Transaction));
    setTransactions((current) => [...imported, ...current].sort((a, b) => (
      (b.transactionDate ?? '').localeCompare(a.transactionDate ?? '')
    )));
    setCategories((current) => current.map((category) => ({
      ...category,
      spent: category.spent + imported
        .filter((transaction) => transaction.direction === 'outflow' && transaction.categoryId === category.id)
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    })));
    return imported.length;
  };

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const deleteAccount = async () => {
    if (!supabase) return;
    const { error } = await supabase.functions.invoke('delete-account');
    if (error) throw error;
    await supabase.auth.signOut({ scope: 'local' });
  };

  if (dataLoading) return <LoadingScreen />;

  if (dataError) {
    return (
      <View style={styles.errorScreen}>
        <Text style={styles.errorTitle}>We couldn’t open your budget</Text>
        <Text style={styles.errorDetail}>{dataError}</Text>
        <Pressable onPress={() => { void refreshCloudData(); }} style={styles.retryButton}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
        <Pressable onPress={openProfile} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Account options</Text>
        </Pressable>
      </View>
    );
  }

  const needsPlanSetup = session && (income === 0 || categories.every((category) => category.budget === 0));
  if ((session && needsPlanSetup) || planEditing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <PlanSetupScreen
          categories={categories}
          initialBills={bills}
          initialIncome={income}
          onCancel={needsPlanSetup ? undefined : () => setPlanEditing(false)}
          onSave={savePlan}
        />
      </SafeAreaView>
    );
  }

  if (session && accountOpen) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AccountScreen
          accountCount={connectedAccounts.length}
          categories={categories}
          email={email}
          fullName={displayName}
          merchantRules={merchantRules}
          onBack={() => setAccountOpen(false)}
          onDelete={deleteAccount}
          onDeleteMerchantRule={removeMerchantRule}
          onExport={exportCloudBudget}
          onImportTransactions={importSpreadsheetTransactions}
          onSignOut={signOut}
          transactionCount={transactions.length}
          transactions={transactions}
        />
      </SafeAreaView>
    );
  }

  const screen = (() => {
    switch (activeTab) {
      case 'transactions':
        return (
          <TransactionsScreen
            categories={categories}
            onAdd={openTransactionEntry}
            onReview={setReviewTransaction}
            transactions={transactions}
          />
        );
      case 'plan':
        return (
          <PlanScreen
            bills={bills}
            categories={categories}
            income={income}
            onAddBill={() => openRecurringBill()}
            onAddPlannedExpense={() => openPlannedExpense()}
            onAddSavingsGoal={() => openSavingsGoal()}
            onEdit={() => setPlanEditing(true)}
            onEditBill={openRecurringBill}
            onEditPlannedExpense={openPlannedExpense}
            onEditSavingsGoal={openSavingsGoal}
            onManageCategories={() => setCategoryManagerOpen(true)}
            onOpenCashFlow={() => setCashFlowOpen(true)}
            onToggleBillPaid={(bill) => { void toggleRecurringBillPaid(bill); }}
            onTogglePlannedExpenseCovered={(expense) => { void togglePlannedExpenseCovered(expense); }}
            plannedExpenses={plannedExpenses}
            recurringBills={recurringBills}
            savingsGoals={savingsGoals}
          />
        );
      case 'connect':
        return <ConnectScreen accounts={connectedAccounts} cloudMode={cloudMode} onAccountsChanged={refreshCloudData} />;
      default:
        return (
          <HomeScreen
            categories={categories}
            income={income}
            onAdd={openTransactionEntry}
            onConnect={() => changeTab('connect')}
            onOpenProfile={openProfile}
            onToggleBillPaid={(bill) => { void toggleRecurringBillPaid(bill); }}
            onTogglePlannedExpenseCovered={(expense) => { void togglePlannedExpenseCovered(expense); }}
            onViewPlan={() => changeTab('plan')}
            onViewTransactions={() => changeTab('transactions')}
            previewMode={!isCloudConfigured}
            plannedExpenses={plannedExpenses}
            transactions={transactions}
            recurringBills={recurringBills}
            userInitials={userInitials}
            userName={firstName}
          />
        );
    }
  })();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <TabTransition direction={transitionDirection} key={activeTab}>{screen}</TabTransition>
      <BottomNav activeTab={activeTab} onChange={changeTab} />
      <AddTransactionModal
        categories={categories}
        initialTransaction={editingTransaction}
        onClose={() => {
          setAddOpen(false);
          setEditingTransaction(null);
        }}
        onSave={saveTransaction}
        saving={addSaving}
        visible={addOpen}
      />
      <RecurringBillModal
        categories={categories}
        initialBill={editingBill}
        onClose={() => {
          setBillOpen(false);
          setEditingBill(null);
        }}
        onDelete={editingBill ? confirmDeleteRecurringBill : undefined}
        onSave={(draft) => { void saveRecurringBill(draft); }}
        saving={billSaving}
        visible={billOpen}
      />
      <PlannedExpenseModal
        categories={categories}
        initialExpense={editingPlannedExpense}
        onClose={() => {
          setPlannedExpenseOpen(false);
          setEditingPlannedExpense(null);
        }}
        onDelete={editingPlannedExpense ? confirmDeletePlannedExpense : undefined}
        onSave={(draft) => { void savePlannedExpense(draft); }}
        saving={plannedExpenseSaving}
        visible={plannedExpenseOpen}
      />
      <SavingsGoalModal
        contributionSaving={savingsContributionSaving}
        initialGoal={editingSavingsGoal}
        onAddContribution={editingSavingsGoal ? saveSavingsGoalContribution : undefined}
        onClose={() => {
          setSavingsGoalOpen(false);
          setEditingSavingsGoal(null);
        }}
        onDelete={editingSavingsGoal ? confirmDeleteSavingsGoal : undefined}
        onDeleteContribution={editingSavingsGoal ? confirmDeleteSavingsGoalContribution : undefined}
        onSave={(draft) => { void saveSavingsGoal(draft); }}
        saving={savingsGoalSaving}
        visible={savingsGoalOpen}
      />
      <CashFlowReportModal
        bills={bills}
        categories={categories}
        income={income}
        onClose={() => setCashFlowOpen(false)}
        plannedExpenses={plannedExpenses}
        previousMonthToDateSpent={previousMonthToDateSpent}
        savingsGoals={savingsGoals}
        transactions={transactions}
        visible={cashFlowOpen}
      />
      <CategoryManagerModal
        categories={categories}
        onClose={() => setCategoryManagerOpen(false)}
        onSaveCategory={saveCategory}
        onSaveSubcategory={saveSubcategory}
        visible={categoryManagerOpen}
      />
      <ReviewTransactionModal
        categories={categories}
        deleting={reviewDeleting}
        onClose={() => setReviewTransaction(null)}
        onDelete={confirmDeleteReviewedTransaction}
        onEdit={editReviewedTransaction}
        onSave={saveTransactionCategory}
        saving={reviewSaving}
        transaction={reviewTransaction}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
    ...(Platform.OS === 'web' ? {
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      paddingTop: 0,
    } : {}),
  },
  app: { backgroundColor: colors.background, flex: 1 },
  errorScreen: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: 32 },
  errorTitle: { color: colors.ink, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  errorDetail: { color: colors.inkMuted, fontSize: 13, lineHeight: 19, marginTop: 8, textAlign: 'center' },
  retryButton: { backgroundColor: colors.primary, borderRadius: 16, marginTop: 24, paddingHorizontal: 28, paddingVertical: 15 },
  retryText: { color: colors.white, fontSize: 15, fontWeight: '800' },
  signOutButton: { marginTop: 12, padding: 12 },
  signOutText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
});
