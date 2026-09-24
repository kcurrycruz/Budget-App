import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { MerchantRulesModal } from '../components/MerchantRulesModal';
import { SpreadsheetDataModal } from '../components/SpreadsheetDataModal';
import { colors, radius, shadow, spacing } from '../theme';
import type { Category, ImportedTransactionDraft, MerchantRule, Transaction } from '../types';

type AccountScreenProps = {
  accountCount: number;
  categories: Category[];
  email: string;
  fullName: string;
  merchantRules: MerchantRule[];
  onBack: () => void;
  onDelete: () => Promise<void>;
  onDeleteMerchantRule: (ruleId: string) => Promise<void>;
  onExport: () => Promise<string>;
  onImportTransactions: (drafts: ImportedTransactionDraft[]) => Promise<number>;
  onSignOut: () => Promise<void>;
  transactionCount: number;
  transactions: Transaction[];
};

export function AccountScreen({
  accountCount,
  categories,
  email,
  fullName,
  merchantRules,
  onBack,
  onDelete,
  onDeleteMerchantRule,
  onExport,
  onImportTransactions,
  onSignOut,
  transactionCount,
  transactions,
}: AccountScreenProps) {
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [spreadsheetOpen, setSpreadsheetOpen] = useState(false);
  const initials = fullName
    ? fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
    : email.slice(0, 2).toUpperCase();

  const exportData = async () => {
    setExporting(true);
    try {
      const payload = await onExport();
      await Share.share({ message: payload, title: 'My Zenify data' });
    } catch (caught) {
      Alert.alert('Export failed', caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    if (deleteText !== 'DELETE' || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete();
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : 'Account deletion failed. Please try again.');
      setDeleting(false);
    }
  };

  const closeDelete = () => {
    if (deleting) return;
    setDeleteOpen(false);
    setDeleteText('');
    setDeleteError(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Back" onPress={onBack} style={styles.backButton}>
          <MaterialCommunityIcons color={colors.ink} name="arrow-left" size={23} />
        </Pressable>
        <Text style={styles.headerTitle}>Account</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
        <Text style={styles.name}>{fullName || 'Your budget'}</Text>
        <Text style={styles.email}>{email}</Text>
        <View style={styles.cloudPill}>
          <View style={styles.statusDot} />
          <Text style={styles.cloudText}>Private cloud sync is on</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{transactionCount}</Text>
          <Text style={styles.statLabel}>Transactions</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{accountCount}</Text>
          <Text style={styles.statLabel}>Connected accounts</Text>
        </View>
      </View>

      <View style={styles.menuCard}>
        <MenuRow
          detail={merchantRules.length === 0
            ? 'Create rules while reviewing bank transactions.'
            : `${merchantRules.length} saved ${merchantRules.length === 1 ? 'rule' : 'rules'} for future transactions.`}
          icon="auto-fix"
          label="Merchant rules"
          onPress={() => setRulesOpen(true)}
        />
        <View style={styles.divider} />
        <MenuRow
          detail="Import or export this month’s transactions as CSV."
          icon="file-table-outline"
          label="Spreadsheet data"
          onPress={() => setSpreadsheetOpen(true)}
        />
        <View style={styles.divider} />
        <MenuRow
          detail="Share a readable JSON copy of your budget."
          icon="download-outline"
          label="Export my data"
          loading={exporting}
          onPress={() => { void exportData(); }}
        />
        <View style={styles.divider} />
        <MenuRow
          detail="Leave this device without deleting anything."
          icon="logout-variant"
          label="Sign out"
          onPress={() => { void onSignOut(); }}
        />
      </View>

      <View style={styles.dangerCard}>
        <View style={styles.dangerCopy}>
          <Text style={styles.dangerTitle}>Delete account</Text>
          <Text style={styles.dangerText}>Permanently removes your login and all budget data.</Text>
        </View>
        <Pressable onPress={() => setDeleteOpen(true)} style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </Pressable>
      </View>

      <Text style={styles.privacyNote}>Your exported data is only shared after you choose a destination in your phone’s share menu.</Text>

      <MerchantRulesModal
        categories={categories}
        onClose={() => setRulesOpen(false)}
        onDelete={onDeleteMerchantRule}
        rules={merchantRules}
        visible={rulesOpen}
      />

      <SpreadsheetDataModal
        categories={categories}
        onClose={() => setSpreadsheetOpen(false)}
        onImport={onImportTransactions}
        transactions={transactions}
        visible={spreadsheetOpen}
      />

      <Modal animationType="slide" onRequestClose={closeDelete} presentationStyle="pageSheet" visible={deleteOpen}>
        <View style={styles.modalContent}>
          <View style={styles.warningIcon}>
            <MaterialCommunityIcons color={colors.danger} name="alert-outline" size={30} />
          </View>
          <Text style={styles.modalTitle}>Delete this account?</Text>
          <Text style={styles.modalDetail}>This permanently deletes your budget, transactions, connected-account records, and login. This cannot be undone.</Text>
          <View style={styles.confirmBlock}>
            <Text style={styles.confirmLabel}>Type DELETE to confirm</Text>
            <TextInput
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!deleting}
              onChangeText={setDeleteText}
              placeholder="DELETE"
              placeholderTextColor={colors.inkMuted}
              style={styles.confirmInput}
              value={deleteText}
            />
          </View>
          {deleteError ? <Text style={styles.deleteError}>{deleteError}</Text> : null}
          <Pressable
            disabled={deleteText !== 'DELETE' || deleting}
            onPress={() => { void deleteAccount(); }}
            style={[styles.deleteForever, (deleteText !== 'DELETE' || deleting) && styles.disabled]}
          >
            {deleting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.deleteForeverText}>Delete forever</Text>}
          </Pressable>
          <Pressable disabled={deleting} onPress={closeDelete} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Keep my account</Text>
          </Pressable>
        </View>
      </Modal>
    </ScrollView>
  );
}

type MenuRowProps = {
  detail: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  loading?: boolean;
  onPress: () => void;
};

function MenuRow({ detail, icon, label, loading = false, onPress }: MenuRowProps) {
  return (
    <Pressable disabled={loading} onPress={onPress} style={styles.menuRow}>
      <View style={styles.menuIcon}>
        {loading
          ? <ActivityIndicator color={colors.primary} size="small" />
          : <MaterialCommunityIcons color={colors.primary} name={icon} size={22} />}
      </View>
      <View style={styles.menuCopy}>
        <Text style={styles.menuTitle}>{label}</Text>
        <Text style={styles.menuDetail}>{detail}</Text>
      </View>
      <MaterialCommunityIcons color={colors.inkMuted} name="chevron-right" size={21} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.background, flexGrow: 1, gap: spacing.xl, padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  backButton: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, height: 42, justifyContent: 'center', width: 42 },
  headerTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  headerSpacer: { width: 42 },
  profileCard: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, ...shadow },
  avatar: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.pill, height: 68, justifyContent: 'center', width: 68 },
  avatarText: { color: colors.primaryDark, fontSize: 20, fontWeight: '800' },
  name: { color: colors.ink, fontSize: 22, fontWeight: '800', marginTop: spacing.md },
  email: { color: colors.inkMuted, fontSize: 13, marginTop: 3 },
  cloudPill: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.pill, flexDirection: 'row', gap: 6, marginTop: spacing.lg, paddingHorizontal: 11, paddingVertical: 7 },
  statusDot: { backgroundColor: colors.primary, borderRadius: 4, height: 7, width: 7 },
  cloudText: { color: colors.primaryDark, fontSize: 11, fontWeight: '800' },
  stats: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, flexDirection: 'row', paddingVertical: spacing.lg },
  stat: { alignItems: 'center', flex: 1, gap: 3 },
  statValue: { color: colors.ink, fontSize: 22, fontWeight: '800' },
  statLabel: { color: colors.inkMuted, fontSize: 11, fontWeight: '700' },
  statDivider: { backgroundColor: colors.border, height: 36, width: StyleSheet.hairlineWidth },
  menuCard: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.lg },
  menuRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.lg },
  menuIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 42, justifyContent: 'center', width: 42 },
  menuCopy: { flex: 1, gap: 2 },
  menuTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  menuDetail: { color: colors.inkMuted, fontSize: 11, lineHeight: 16 },
  divider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth, marginLeft: 54 },
  dangerCard: { alignItems: 'center', backgroundColor: '#FBEAEA', borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  dangerCopy: { flex: 1, gap: 3 },
  dangerTitle: { color: colors.danger, fontSize: 14, fontWeight: '800' },
  dangerText: { color: '#7D4444', fontSize: 11, lineHeight: 16 },
  deleteButton: { borderColor: colors.danger, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  deleteButtonText: { color: colors.danger, fontSize: 12, fontWeight: '800' },
  privacyNote: { color: colors.inkMuted, fontSize: 10, lineHeight: 15, paddingHorizontal: spacing.md, textAlign: 'center' },
  modalContent: { backgroundColor: colors.background, flex: 1, gap: spacing.xl, justifyContent: 'center', padding: spacing.xl },
  warningIcon: { alignItems: 'center', alignSelf: 'center', backgroundColor: '#FBEAEA', borderRadius: radius.pill, height: 66, justifyContent: 'center', width: 66 },
  modalTitle: { color: colors.ink, fontSize: 28, fontWeight: '800', textAlign: 'center' },
  modalDetail: { color: colors.inkMuted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  confirmBlock: { gap: spacing.sm },
  confirmLabel: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  confirmInput: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.ink, fontSize: 17, fontWeight: '800', height: 54, letterSpacing: 1.5, paddingHorizontal: spacing.lg, textAlign: 'center' },
  deleteError: { color: colors.danger, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  deleteForever: { alignItems: 'center', backgroundColor: colors.danger, borderRadius: radius.md, height: 54, justifyContent: 'center' },
  deleteForeverText: { color: colors.white, fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.35 },
  cancelButton: { alignItems: 'center', padding: spacing.md },
  cancelText: { color: colors.primary, fontSize: 14, fontWeight: '800' },
});
