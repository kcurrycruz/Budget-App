import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing } from '../theme';
import type { PlaidConnectButtonProps } from './PlaidConnectButton.types';

export function PlaidConnectButton({ appearance = 'primary', enabled, itemId, label }: PlaidConnectButtonProps) {
  const open = () => Alert.alert(
    enabled ? 'Open the web app' : 'Sign in first',
    enabled
      ? `${itemId ? 'Repairing connections is' : 'Plaid Sandbox is'} available in the web beta. Native Plaid Link will be added with the custom iPhone build.`
      : 'Create or sign in to your account before connecting a bank.',
  );

  return (
    <Pressable accessibilityRole="button" onPress={open} style={[styles.button, appearance === 'secondary' && styles.buttonSecondary]}>
      <MaterialCommunityIcons color={appearance === 'secondary' ? colors.primaryDark : colors.white} name={itemId ? 'shield-refresh-outline' : 'link-variant'} size={20} />
      <Text style={[styles.label, appearance === 'secondary' && styles.labelSecondary]}>{label ?? (itemId ? 'Repair bank connection' : 'Connect an account')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', marginTop: spacing.xl, padding: spacing.lg, width: '100%' },
  buttonSecondary: { backgroundColor: colors.primarySoft, marginTop: spacing.sm },
  label: { color: colors.white, fontSize: 15, fontWeight: '800' },
  labelSecondary: { color: colors.primaryDark },
});
