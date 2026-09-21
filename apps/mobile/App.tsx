import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { AddTransactionModal } from './src/components/AddTransactionModal';
import { BottomNav } from './src/components/BottomNav';
import { RecurringBillModal } from './src/components/RecurringBillModal';
import { ReviewTransactionModal } from './src/components/ReviewTransactionModal';
import {
  categorizeTransaction,
  createManualTransaction,
  createRecurringBill,
  deleteManualTransaction,
  deleteRecurringBill,
  exportCloudBudget,
  loadCloudBudget,
  saveMonthlyPlan,
  setRecurringBillPaid,
  updateManualTransaction,
  updateRecurringBill,
} from './src/data/budgetRepository';
import { accounts, initialCategories, initialRecurringBills, initialTransactions, monthlyBills, monthlyIncome } from './src/data/demo';
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
import type { AppTab, ManualTransactionDraft, RecurringBill, RecurringBillDraft, Transaction } from './src/types';
import { formatActivityDate } from './src/utils/date';

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
  const [transactions, setTransactions] = useState<Transaction[]>(cloudMode ? [] : initialTransactions);
  const [categories, setCategories] = useState(cloudMode ? [] : initialCategories);
  const [connectedAccounts, setConnectedAccounts] = useState(cloudMode ? [] : accounts);
  const [income, setIncome] = useState(cloudMode ? 0 : monthlyIncome);
  const [bills, setBills] = useState(cloudMode ? 0 : monthlyBills);
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>(cloudMode ? [] : initialRecurringBills);
  const [dataLoading, setDataLoading] = useState(cloudMode);
  const [dataError, setDataError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [planEditing, setPlanEditing] = useState(forcePlanPreview);
  const [billOpen, setBillOpen] = useState(false);
  const [billSaving, setBillSaving] = useState(false);
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [reviewTransaction, setReviewTransaction] = useState<Transaction | null>(null);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewDeleting, setReviewDeleting] = useState(false);

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
      setRecurringBills(data.recurringBills);
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

  const saveTransactionCategory = async (categoryId: string) => {
    if (!reviewTransaction) return;
    setReviewSaving(true);
    try {
      if (session) await categorizeTransaction(reviewTransaction.id, categoryId);

      const previousCategoryId = reviewTransaction.categoryId;
      const affectsSpending = reviewTransaction.direction !== 'inflow';
      setTransactions((current) => current.map((transaction) => (
        transaction.id === reviewTransaction.id
          ? { ...transaction, categoryId, needsReview: false }
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

  const email = session?.user.email ?? '';
  const userInitials = email ? email.slice(0, 2).toUpperCase() : 'KC';
  const openProfile = () => {
    if (!session || !supabase) {
      Alert.alert('Preview mode', 'Cloud accounts will appear here after Supabase is connected.');
      return;
    }
    setAccountOpen(true);
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
          email={email}
          fullName={String(session.user.user_metadata.full_name ?? '')}
          onBack={() => setAccountOpen(false)}
          onDelete={deleteAccount}
          onExport={exportCloudBudget}
          onSignOut={signOut}
          transactionCount={transactions.length}
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
            onEdit={() => setPlanEditing(true)}
            onEditBill={openRecurringBill}
            onToggleBillPaid={(bill) => { void toggleRecurringBillPaid(bill); }}
            recurringBills={recurringBills}
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
            onConnect={() => setActiveTab('connect')}
            onOpenProfile={openProfile}
            onToggleBillPaid={(bill) => { void toggleRecurringBillPaid(bill); }}
            onViewPlan={() => setActiveTab('plan')}
            onViewTransactions={() => setActiveTab('transactions')}
            previewMode={!isCloudConfigured}
            transactions={transactions}
            recurringBills={recurringBills}
            userInitials={userInitials}
          />
        );
    }
  })();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.app}>{screen}</View>
      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
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
  safeArea: { backgroundColor: colors.background, flex: 1 },
  app: { backgroundColor: colors.background, flex: 1 },
  errorScreen: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: 32 },
  errorTitle: { color: colors.ink, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  errorDetail: { color: colors.inkMuted, fontSize: 13, lineHeight: 19, marginTop: 8, textAlign: 'center' },
  retryButton: { backgroundColor: colors.primary, borderRadius: 16, marginTop: 24, paddingHorizontal: 28, paddingVertical: 15 },
  retryText: { color: colors.white, fontSize: 15, fontWeight: '800' },
  signOutButton: { marginTop: 12, padding: 12 },
  signOutText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
});
