import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radius, spacing } from '../theme';
import type { Category, ImportedTransactionDraft, Transaction } from '../types';
import { createTransactionsCsv, parseTransactionsCsv, type TransactionCsvPreview } from '../utils/transactionCsv';
import { formatMoney } from '../utils/money';

type SpreadsheetDataModalProps = {
  categories: Category[];
  onClose: () => void;
  onImport: (drafts: ImportedTransactionDraft[]) => Promise<number>;
  transactions: Transaction[];
  visible: boolean;
};

type SelectedFile = TransactionCsvPreview & { name: string };

const monthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export function SpreadsheetDataModal({ categories, onClose, onImport, transactions, visible }: SpreadsheetDataModalProps) {
  const [busy, setBusy] = useState<'export' | 'choose' | 'import' | null>(null);
  const [selected, setSelected] = useState<SelectedFile | null>(null);

  const close = () => {
    if (busy) return;
    setSelected(null);
    onClose();
  };

  const exportCsv = async () => {
    setBusy('export');
    try {
      const csv = `\uFEFF${createTransactionsCsv(transactions, categories)}`;
      const fileName = `zenify-transactions-${monthKey()}.csv`;

      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      } else {
        if (!FileSystem.cacheDirectory) throw new Error('Temporary file storage is unavailable.');
        const uri = `${FileSystem.cacheDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(uri, csv);
        if (!await Sharing.isAvailableAsync()) throw new Error('File sharing is unavailable on this device.');
        await Sharing.shareAsync(uri, {
          dialogTitle: 'Export Zenify transactions',
          mimeType: 'text/csv',
          UTI: 'public.comma-separated-values-text',
        });
      }
    } catch (caught) {
      Alert.alert('Could not export CSV', caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const chooseCsv = async () => {
    setBusy('choose');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        base64: false,
        copyToCacheDirectory: true,
        multiple: false,
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) throw new Error('No file was selected.');
      if ((asset.size ?? 0) > 2_000_000) throw new Error('Choose a CSV file smaller than 2 MB.');
      const text = Platform.OS === 'web' && asset.file
        ? await asset.file.text()
        : await FileSystem.readAsStringAsync(asset.uri);
      setSelected({ name: asset.name, ...parseTransactionsCsv(text, categories, transactions) });
    } catch (caught) {
      Alert.alert('Could not read CSV', caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const importCsv = async () => {
    if (!selected?.drafts.length) return;
    setBusy('import');
    try {
      const count = await onImport(selected.drafts);
      setSelected(null);
      Alert.alert('Import complete', `${count} transaction${count === 1 ? '' : 's'} added to Zenify.`);
    } catch (caught) {
      Alert.alert('Could not import CSV', caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={close} presentationStyle="pageSheet" visible={visible}>
      <View style={styles.modal}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Spreadsheet data</Text>
            <Text style={styles.subtitle}>Move transactions with a simple CSV file.</Text>
          </View>
          <Pressable accessibilityLabel="Close spreadsheet data" disabled={Boolean(busy)} onPress={close} style={styles.closeButton}>
            <MaterialCommunityIcons color={colors.ink} name="close" size={22} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.actionCard}>
            <View style={styles.actionIcon}>
              <MaterialCommunityIcons color={colors.primary} name="file-download-outline" size={25} />
            </View>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>Export this month</Text>
              <Text style={styles.actionDetail}>Download {transactions.length} transaction{transactions.length === 1 ? '' : 's'} for Excel, Numbers, or Google Sheets.</Text>
            </View>
            <Pressable accessibilityLabel="Export transactions CSV" disabled={Boolean(busy)} onPress={() => { void exportCsv(); }} style={styles.secondaryButton}>
              {busy === 'export'
                ? <ActivityIndicator color={colors.primary} size="small" />
                : <Text style={styles.secondaryButtonText}>Export</Text>}
            </Pressable>
          </View>

          <View style={styles.actionCard}>
            <View style={styles.actionIcon}>
              <MaterialCommunityIcons color={colors.primary} name="file-upload-outline" size={25} />
            </View>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>Import transactions</Text>
              <Text style={styles.actionDetail}>Choose a CSV exported from Zenify or use the same seven columns.</Text>
            </View>
            <Pressable accessibilityLabel="Choose transactions CSV" disabled={Boolean(busy)} onPress={() => { void chooseCsv(); }} style={styles.secondaryButton}>
              {busy === 'choose'
                ? <ActivityIndicator color={colors.primary} size="small" />
                : <Text style={styles.secondaryButtonText}>Choose</Text>}
            </Pressable>
          </View>

          <View style={styles.formatCard}>
            <Text style={styles.formatTitle}>CSV columns</Text>
            <Text style={styles.columns}>Date · Merchant · Amount · Type · Category · Subcategory · Note</Text>
            <Text style={styles.formatDetail}>Use this month’s YYYY-MM-DD dates and Expense or Income for Type. Unknown categories are added to your Review queue.</Text>
          </View>

          {selected ? (
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <View style={styles.previewHeading}>
                  <MaterialCommunityIcons color={colors.primary} name="file-check-outline" size={22} />
                  <View style={styles.previewHeadingText}>
                    <Text numberOfLines={1} style={styles.previewTitle}>{selected.name}</Text>
                    <Text style={styles.previewDetail}>{selected.totalRows} row{selected.totalRows === 1 ? '' : 's'} checked</Text>
                  </View>
                </View>
                <Pressable accessibilityLabel="Clear selected CSV" disabled={Boolean(busy)} onPress={() => setSelected(null)}>
                  <MaterialCommunityIcons color={colors.inkMuted} name="close-circle" size={21} />
                </Pressable>
              </View>

              <View style={styles.previewStats}>
                <PreviewStat label="Ready" value={selected.drafts.length} />
                <PreviewStat label="Review" value={selected.reviewCount} />
                <PreviewStat label="Skipped" value={selected.duplicateCount + selected.invalidCount} />
              </View>

              {selected.drafts.slice(0, 3).map((draft, index) => (
                <View key={`${draft.transactionDate}-${draft.merchant}-${index}`} style={styles.previewRow}>
                  <View style={styles.previewRowCopy}>
                    <Text numberOfLines={1} style={styles.previewMerchant}>{draft.merchant}</Text>
                    <Text style={styles.previewMeta}>{draft.transactionDate} · {draft.direction === 'inflow' ? 'Income' : draft.needsReview ? 'Needs review' : 'Expense'}</Text>
                  </View>
                  <Text style={styles.previewAmount}>{draft.direction === 'inflow' ? '+' : '−'}{formatMoney(draft.amount, true)}</Text>
                </View>
              ))}

              {selected.duplicateCount ? <Text style={styles.notice}>{selected.duplicateCount} duplicate row{selected.duplicateCount === 1 ? '' : 's'} will be skipped.</Text> : null}
              {selected.issues.map((issue) => <Text key={issue} style={styles.issue}>{issue}</Text>)}
              {selected.invalidCount > selected.issues.length ? <Text style={styles.issue}>Plus {selected.invalidCount - selected.issues.length} more invalid row{selected.invalidCount - selected.issues.length === 1 ? '' : 's'}.</Text> : null}

              <Pressable
                accessibilityLabel="Import ready transactions"
                disabled={Boolean(busy) || selected.drafts.length === 0}
                onPress={() => { void importCsv(); }}
                style={[styles.importButton, selected.drafts.length === 0 && styles.disabled]}
              >
                {busy === 'import'
                  ? <ActivityIndicator color={colors.white} />
                  : <Text style={styles.importButtonText}>Import {selected.drafts.length} transaction{selected.drafts.length === 1 ? '' : 's'}</Text>}
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

function PreviewStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.previewStat}>
      <Text style={styles.previewStatValue}>{value}</Text>
      <Text style={styles.previewStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  modal: { backgroundColor: colors.background, flex: 1, paddingTop: spacing.lg },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  title: { color: colors.ink, fontSize: 25, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: colors.inkMuted, fontSize: 12, marginTop: 3 },
  closeButton: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, height: 42, justifyContent: 'center', width: 42 },
  content: { gap: spacing.lg, padding: spacing.lg, paddingBottom: spacing.xxl },
  actionCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  actionIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 46, justifyContent: 'center', width: 46 },
  actionCopy: { flex: 1, gap: 3 },
  actionTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  actionDetail: { color: colors.inkMuted, fontSize: 11, lineHeight: 16 },
  secondaryButton: { alignItems: 'center', borderColor: colors.primary, borderRadius: radius.pill, borderWidth: 1, justifyContent: 'center', minHeight: 38, minWidth: 70, paddingHorizontal: spacing.md },
  secondaryButtonText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  formatCard: { backgroundColor: colors.primarySoft, borderRadius: radius.md, gap: spacing.sm, padding: spacing.lg },
  formatTitle: { color: colors.primaryDark, fontSize: 13, fontWeight: '800' },
  columns: { color: colors.primaryDark, fontSize: 11, fontWeight: '700', lineHeight: 17 },
  formatDetail: { color: colors.inkMuted, fontSize: 11, lineHeight: 16 },
  previewCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  previewHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  previewHeading: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: spacing.sm },
  previewHeadingText: { flex: 1 },
  previewTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  previewDetail: { color: colors.inkMuted, fontSize: 10, marginTop: 2 },
  previewStats: { backgroundColor: colors.surfaceMuted, borderRadius: radius.sm, flexDirection: 'row', paddingVertical: spacing.md },
  previewStat: { alignItems: 'center', flex: 1, gap: 2 },
  previewStatValue: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  previewStatLabel: { color: colors.inkMuted, fontSize: 10, fontWeight: '700' },
  previewRow: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.md, paddingTop: spacing.md },
  previewRowCopy: { flex: 1 },
  previewMerchant: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  previewMeta: { color: colors.inkMuted, fontSize: 10, marginTop: 2 },
  previewAmount: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  notice: { color: colors.inkMuted, fontSize: 10, lineHeight: 15 },
  issue: { color: colors.danger, fontSize: 10, lineHeight: 15 },
  importButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, height: 50, justifyContent: 'center' },
  importButtonText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.35 },
});
