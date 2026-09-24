import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import { currentMonthStart, formatMonth, shiftMonth } from '../utils/date';

type MonthPickerModalProps = {
  month: string;
  onClose: () => void;
  onSelect: (month: string) => void;
  visible: boolean;
};

export function MonthPickerModal({ month, onClose, onSelect, visible }: MonthPickerModalProps) {
  const [draftMonth, setDraftMonth] = useState(month);

  useEffect(() => {
    if (visible) setDraftMonth(month);
  }, [month, visible]);

  const currentMonth = currentMonthStart();

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Close month picker" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>BUDGET HISTORY</Text>
              <Text style={styles.title}>Choose a month</Text>
            </View>
            <Pressable accessibilityLabel="Close month picker" onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons color={colors.ink} name="close" size={21} />
            </Pressable>
          </View>

          <View style={styles.monthRow}>
            <Pressable accessibilityLabel="Previous month" onPress={() => setDraftMonth((value) => shiftMonth(value, -1))} style={styles.arrowButton}>
              <MaterialCommunityIcons color={colors.primaryDark} name="chevron-left" size={28} />
            </Pressable>
            <View style={styles.monthCopy}>
              <Text style={styles.month}>{formatMonth(draftMonth, false)}</Text>
              <Text style={styles.year}>{draftMonth.slice(0, 4)}</Text>
            </View>
            <Pressable accessibilityLabel="Next month" onPress={() => setDraftMonth((value) => shiftMonth(value, 1))} style={styles.arrowButton}>
              <MaterialCommunityIcons color={colors.primaryDark} name="chevron-right" size={28} />
            </Pressable>
          </View>

          {draftMonth !== currentMonth ? (
            <Pressable onPress={() => setDraftMonth(currentMonth)} style={styles.todayButton}>
              <MaterialCommunityIcons color={colors.primaryDark} name="calendar-today" size={17} />
              <Text style={styles.todayText}>Jump to this month</Text>
            </Pressable>
          ) : (
            <View style={styles.currentPill}>
              <View style={styles.currentDot} />
              <Text style={styles.currentText}>Current month</Text>
            </View>
          )}

          <Pressable onPress={() => onSelect(draftMonth)} style={styles.selectButton}>
            <Text style={styles.selectText}>View {formatMonth(draftMonth, false)}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { alignItems: 'center', backgroundColor: '#0C1B2ACC', flex: 1, justifyContent: 'center', padding: spacing.lg },
  card: { backgroundColor: colors.background, borderRadius: radius.lg, gap: spacing.xl, maxWidth: 420, padding: spacing.xl, width: '100%' },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: colors.ink, fontSize: 23, fontWeight: '800', marginTop: 3 },
  closeButton: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, height: 40, justifyContent: 'center', width: 40 },
  monthRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.lg, justifyContent: 'space-between', paddingVertical: spacing.md },
  arrowButton: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.pill, height: 48, justifyContent: 'center', width: 48 },
  monthCopy: { alignItems: 'center', flex: 1 },
  month: { color: colors.ink, fontSize: 29, fontWeight: '800', letterSpacing: -0.7 },
  year: { color: colors.inkMuted, fontSize: 14, fontWeight: '700', marginTop: 2 },
  todayButton: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', gap: spacing.sm, padding: spacing.sm },
  todayText: { color: colors.primaryDark, fontSize: 13, fontWeight: '800' },
  currentPill: { alignItems: 'center', alignSelf: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.pill, flexDirection: 'row', gap: 7, paddingHorizontal: 12, paddingVertical: 8 },
  currentDot: { backgroundColor: colors.primary, borderRadius: radius.pill, height: 7, width: 7 },
  currentText: { color: colors.primaryDark, fontSize: 12, fontWeight: '800' },
  selectButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.lg },
  selectText: { color: colors.white, fontSize: 15, fontWeight: '800' },
});
