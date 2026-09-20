import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { supabase } from '../lib/supabase';
import { colors, radius, shadow, spacing } from '../theme';

type UpdatePasswordScreenProps = { onComplete: () => void };

export function UpdatePasswordScreen({ onComplete }: UpdatePasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const passwordsMatch = password === confirmation;
  const canSubmit = password.length >= 8 && confirmation.length >= 8 && passwordsMatch;

  const submit = async () => {
    if (!supabase || !canSubmit || busy) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    onComplete();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brandMark}>
          <MaterialCommunityIcons color={colors.white} name="lock-reset" size={31} />
        </View>
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>SECURE YOUR ACCOUNT</Text>
          <Text style={styles.title}>Choose a new password</Text>
          <Text style={styles.detail}>Use at least eight characters and avoid reusing a password from another account.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>New password</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="new-password"
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              placeholderTextColor={colors.inkMuted}
              secureTextEntry
              style={styles.input}
              value={password}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="new-password"
              onChangeText={setConfirmation}
              placeholder="Type it again"
              placeholderTextColor={colors.inkMuted}
              secureTextEntry
              style={styles.input}
              value={confirmation}
            />
            {confirmation.length > 0 && !passwordsMatch ? <Text style={styles.matchError}>Passwords do not match.</Text> : null}
          </View>

          {message ? (
            <View style={styles.message}>
              <MaterialCommunityIcons color={colors.danger} name="alert-circle-outline" size={20} />
              <Text style={styles.messageText}>{message}</Text>
            </View>
          ) : null}

          <Pressable
            disabled={!canSubmit || busy}
            onPress={submit}
            style={[styles.primaryButton, (!canSubmit || busy) && styles.buttonDisabled]}
          >
            {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>Update password</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  content: { flexGrow: 1, gap: spacing.xl, justifyContent: 'center', padding: spacing.xl, paddingVertical: spacing.xxl },
  brandMark: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: radius.md, height: 56, justifyContent: 'center', width: 56 },
  intro: { gap: spacing.sm },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  title: { color: colors.ink, fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  detail: { color: colors.inkMuted, fontSize: 15, lineHeight: 22 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.lg, padding: spacing.xl, ...shadow },
  field: { gap: spacing.sm },
  label: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.ink, fontSize: 16, height: 54, paddingHorizontal: spacing.lg },
  matchError: { color: colors.danger, fontSize: 12 },
  message: { alignItems: 'flex-start', backgroundColor: '#FBEAEA', borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  messageText: { color: colors.danger, flex: 1, fontSize: 12, lineHeight: 18 },
  primaryButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, height: 54, justifyContent: 'center' },
  buttonDisabled: { opacity: 0.4 },
  primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: '800' },
});
