import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme';
import type { AppTab } from '../types';
import { useReducedMotion } from '../utils/useReducedMotion';

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

type BottomNavItemProps = {
  active: boolean;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  id: AppTab;
  label: string;
  onChange: (tab: AppTab) => void;
};

function BottomNavItem({ active, icon, id, label, onChange }: BottomNavItemProps) {
  const reduceMotion = useReducedMotion();
  const selectedProgress = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      selectedProgress.setValue(active ? 1 : 0);
      return undefined;
    }

    const animation = Animated.spring(selectedProgress, {
      damping: 15,
      mass: 0.7,
      stiffness: 220,
      toValue: active ? 1 : 0,
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [active, reduceMotion, selectedProgress]);

  const animatedStyle = {
    transform: [
      { scale: selectedProgress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
      { translateY: selectedProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) },
    ],
  };

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={() => onChange(id)}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
    >
      <Animated.View style={[styles.iconWrap, active && styles.iconWrapActive, animatedStyle]}>
        <MaterialCommunityIcons
          color={active ? colors.primaryDark : colors.inkMuted}
          name={icon}
          size={22}
        />
      </Animated.View>
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  return (
    <View style={styles.container} testID="bottom-navigation">
      {tabs.map((tab) => (
        <BottomNavItem
          active={tab.id === activeTab}
          icon={tab.icon}
          id={tab.id}
          key={tab.id}
          label={tab.label}
          onChange={onChange}
        />
      ))}
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
  itemPressed: { opacity: 0.68 },
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
