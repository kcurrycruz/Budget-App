import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing } from '../theme';
import type { PlaidConnectButtonProps } from './PlaidConnectButton.types';

export function PlaidConnectButton({ enabled }: PlaidConnectButtonProps) {
  const open = () => Alert.alert(
    enabled ? 'Open the web app' : 'Sign in first',
    enabled
      ? 'Plaid Sandbox is available in the web beta. Native Plaid Link will be added with the custom iPhone build.'
      : 'Create or sign in to your account before connecting a bank.',
  );

  return (
    <Pressable accessibilityRole="button" onPress={open} style={styles.button}>
      <MaterialCommunityIcons color={colors.white} name="link-variant" size={20} />
      <Text style={styles.label}>Connect an account</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', marginTop: spacing.xl, padding: spacing.lg, width: '100%' },
  label: { color: colors.white, fontSize: 15, fontWeight: '800' },
});
