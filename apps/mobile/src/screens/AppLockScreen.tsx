import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ActivityIndicator, Image, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadow, spacing } from '../theme';

type AppLockScreenProps = {
  biometricAvailable: boolean;
  biometricLabel: string;
  busy: boolean;
  error?: string | null;
  onPasswordSignIn: () => void;
  onUnlock: () => void;
};

export function AppLockScreen({ biometricAvailable, biometricLabel, busy, error, onPasswordSignIn, onUnlock }: AppLockScreenProps) {
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.shell}>
        <View style={styles.brandRow}>
          <Image accessibilityLabel="Zenify logo" source={require('../../assets/zenify-logo.jpg')} style={styles.brandMark} />
          <View>
            <Text style={styles.brandName}>Zenify</Text>
            <Text style={styles.brandLine}>Your finances, protected.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.lockIcon}>
            <MaterialCommunityIcons color={colors.primaryDark} name={biometricAvailable ? 'face-recognition' : 'shield-lock-outline'} size={34} />
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.detail}>
            {biometricAvailable
              ? `Use ${biometricLabel} to unlock your private budget.`
              : 'For your security, sign in again before opening your budget.'}
          </Text>

          {error ? (
            <View style={styles.errorCard}>
              <MaterialCommunityIcons color={colors.danger} name="alert-circle-outline" size={19} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {biometricAvailable ? (
            <Pressable disabled={busy} onPress={onUnlock} style={[styles.primaryButton, busy && styles.disabled]}>
              {busy
                ? <ActivityIndicator color={colors.white} />
                : <>
                    <MaterialCommunityIcons color={colors.white} name="face-recognition" size={23} />
                    <Text style={styles.primaryText}>Unlock with {biometricLabel}</Text>
                  </>}
            </Pressable>
          ) : null}

          <Pressable disabled={busy} onPress={onPasswordSignIn} style={styles.passwordButton}>
            <MaterialCommunityIcons color={colors.primaryDark} name="form-textbox-password" size={20} />
            <Text style={styles.passwordText}>Sign in with password</Text>
          </Pressable>
        </View>

        <View style={styles.privacyRow}>
          <MaterialCommunityIcons color={colors.primary} name="shield-check-outline" size={18} />
          <Text style={styles.privacyText}>Your budget stays hidden until you unlock Zenify.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: spacing.lg },
  shell: { gap: spacing.xl, maxWidth: 440, width: '100%' },
  brandRow: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', gap: spacing.md },
  brandMark: { borderRadius: radius.md, height: 56, width: 56 },
  brandName: { color: colors.ink, fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  brandLine: { color: colors.inkMuted, fontSize: 12, marginTop: 2 },
  card: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.lg, padding: spacing.xl, ...shadow },
  lockIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.pill, height: 68, justifyContent: 'center', width: 68 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  detail: { color: colors.inkMuted, fontSize: 14, lineHeight: 21, maxWidth: 310, textAlign: 'center' },
  errorCard: { alignItems: 'flex-start', alignSelf: 'stretch', backgroundColor: '#FBEAEA', borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  errorText: { color: colors.danger, flex: 1, fontSize: 12, lineHeight: 18 },
  primaryButton: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, height: 54, justifyContent: 'center' },
  primaryText: { color: colors.white, fontSize: 15, fontWeight: '800' },
  passwordButton: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, height: 50, justifyContent: 'center' },
  passwordText: { color: colors.primaryDark, fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  privacyRow: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', gap: spacing.sm },
  privacyText: { color: colors.inkMuted, fontSize: 11 },
});
