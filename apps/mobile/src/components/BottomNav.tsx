import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme';
import type { AppTab } from '../types';

type BottomNavProps = {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
};

const tabs: Array<{ id: AppTab; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = [
  { id: 'home', label: 'Home', icon: 'home-variant-outline' },
  { id: 'transactions', label: 'Activity', icon: 'format-list-bulleted' },
  { id: 'plan', label: 'Plan', icon: 'chart-donut' },
  { id: 'connect', label: 'Accounts', icon: 'bank-outline' },
];

export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  return (
    <View style={styles.container} testID="bottom-navigation">
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={styles.item}
          >
            <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
              <MaterialCommunityIcons
                color={active ? colors.primaryDark : colors.inkMuted}
                name={tab.icon}
                size={22}
              />
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  item: { alignItems: 'center', flex: 1, gap: 2 },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 14,
    height: 30,
    justifyContent: 'center',
    width: 48,
  },
  iconWrapActive: { backgroundColor: colors.primarySoft },
  label: { color: colors.inkMuted, fontSize: 11, fontWeight: '600' },
  labelActive: { color: colors.primaryDark, fontWeight: '800' },
});
