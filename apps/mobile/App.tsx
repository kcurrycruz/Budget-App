import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { AddTransactionModal } from './src/components/AddTransactionModal';
import { BottomNav } from './src/components/BottomNav';
import { ReviewTransactionModal } from './src/components/ReviewTransactionModal';
import { categorizeTransaction, createManualTransaction, exportCloudBudget, loadCloudBudget, saveMonthlyPlan } from './src/data/budgetRepository';
import { accounts, initialCategories, initialTransactions, monthlyBills, monthlyIncome } from './src/data/demo';
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
import type { AppTab, ManualTransactionDraft, Transaction } from './src/types';
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
  const [dataLoading, setDataLoading] = useState(cloudMode);
  const [dataError, setDataError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [planEditing, setPlanEditing] = useState(forcePlanPreview);
  const [accountOpen, setAccountOpen] = useState(false);
  const [reviewTransaction, setReviewTransaction] = useState<Transaction | null>(null);
  const [reviewSaving, setReviewSaving] = useState(false);

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
    } catch (caught) {
      setDataError(caught instanceof Error ? caught.message : 'Your cloud budget could not be loaded.');
    } finally {
      setDataLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void refreshCloudData();
  }, [refreshCloudData]);

  const addTransaction = async (draft: ManualTransactionDraft) => {
    let transaction: Transaction;
    setAddSaving(true);
    try {
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
          };
    } catch (caught) {
      Alert.alert('Could not save transaction', caught instanceof Error ? caught.message : 'Please try again.');
      return;
    } finally {
      setAddSaving(false);
    }

    setTransactions((current) => [transaction, ...current]);
    if (draft.direction === 'outflow') {
      setCategories((current) => current.map((category) => (
        category.id === draft.categoryId
          ? { ...category, spent: category.spent + draft.amount }
          : category
      )));
    }
    setAddOpen(false);
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
            onAdd={() => setAddOpen(true)}
            onReview={setReviewTransaction}
            transactions={transactions}
          />
        );
      case 'plan':
        return <PlanScreen bills={bills} categories={categories} income={income} onEdit={() => setPlanEditing(true)} />;
      case 'connect':
        return <ConnectScreen accounts={connectedAccounts} cloudMode={cloudMode} onAccountsChanged={refreshCloudData} />;
      default:
        return (
          <HomeScreen
            categories={categories}
            income={income}
            onAdd={() => setAddOpen(true)}
            onConnect={() => setActiveTab('connect')}
            onOpenProfile={openProfile}
            onViewTransactions={() => setActiveTab('transactions')}
            previewMode={!isCloudConfigured}
            transactions={transactions}
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
        onClose={() => setAddOpen(false)}
        onSave={addTransaction}
        saving={addSaving}
        visible={addOpen}
      />
      <ReviewTransactionModal
        categories={categories}
        onClose={() => setReviewTransaction(null)}
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
