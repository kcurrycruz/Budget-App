import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';

import { AddTransactionModal } from './src/components/AddTransactionModal';
import { BottomNav } from './src/components/BottomNav';
import { accounts, initialCategories, initialTransactions, monthlyBills, monthlyIncome } from './src/data/demo';
import { ConnectScreen } from './src/screens/ConnectScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { PlanScreen } from './src/screens/PlanScreen';
import { TransactionsScreen } from './src/screens/TransactionsScreen';
import { colors } from './src/theme';
import type { AppTab, Transaction } from './src/types';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [transactions, setTransactions] = useState(initialTransactions);
  const [categories, setCategories] = useState(initialCategories);
  const [addOpen, setAddOpen] = useState(false);

  const addTransaction = (draft: { merchant: string; amount: number; categoryId: string }) => {
    const transaction: Transaction = {
      id: `manual-${Date.now()}`,
      merchant: draft.merchant,
      amount: draft.amount,
      categoryId: draft.categoryId,
      date: 'Today',
      account: 'Manual entry',
    };

    setTransactions((current) => [transaction, ...current]);
    setCategories((current) => current.map((category) => (
      category.id === draft.categoryId
        ? { ...category, spent: category.spent + draft.amount }
        : category
    )));
    setAddOpen(false);
  };

  const screen = (() => {
    switch (activeTab) {
      case 'transactions':
        return <TransactionsScreen categories={categories} onAdd={() => setAddOpen(true)} transactions={transactions} />;
      case 'plan':
        return <PlanScreen bills={monthlyBills} categories={categories} income={monthlyIncome} />;
      case 'connect':
        return <ConnectScreen accounts={accounts} />;
      default:
        return (
          <HomeScreen
            categories={categories}
            income={monthlyIncome}
            onAdd={() => setAddOpen(true)}
            onConnect={() => setActiveTab('connect')}
            onViewTransactions={() => setActiveTab('transactions')}
            transactions={transactions}
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
        visible={addOpen}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  app: { backgroundColor: colors.background, flex: 1 },
});
