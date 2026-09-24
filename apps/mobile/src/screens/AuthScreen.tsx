import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { passwordResetRedirectUrl, supabase } from '../lib/supabase';
import { colors, radius, shadow, spacing } from '../theme';

type AuthMode = 'reset' | 'signIn' | 'signUp';

type AuthScreenProps = {
  onAuthenticated?: () => void;
};

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const isSignUp = mode === 'signUp';
  const isReset = mode === 'reset';
  const canSubmit = email.trim().length > 3
    && (isReset || password.length >= 8)
    && (!isSignUp || fullName.trim().length > 1);

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setMessage(null);
    setIsError(false);
    setPassword('');
  };

  const submit = async () => {
    if (!supabase || !canSubmit || busy) return;

    setBusy(true);
    setMessage(null);
    setIsError(false);

    if (isReset) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        ...(passwordResetRedirectUrl ? { redirectTo: passwordResetRedirectUrl } : {}),
      });
      setBusy(false);
      if (error) {
        setIsError(true);
        setMessage(error.message);
        return;
      }
      setMessage('If an account exists for this email, a secure reset link is on the way.');
      return;
    }

    const result = isSignUp
      ? await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() } },
        })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password });

    setBusy(false);

    if (result.error) {
      setIsError(true);
      setMessage(result.error.message);
      return;
    }

    if (isSignUp && !result.data.session) {
      setMessage('Check your email to confirm your account, then come back and sign in.');
    } else if (result.data.session) {
      onAuthenticated?.();
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}>
          <Image accessibilityLabel="Zenify logo" source={require('../../assets/zenify-logo.jpg')} style={styles.brandMark} />
          <View>
            <Text style={styles.brandName}>Zenify</Text>
            <Text style={styles.brandLine}>Your finances, unified.</Text>
          </View>
        </View>
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>ONE CLEAR FINANCIAL VIEW</Text>
          <Text style={styles.title}>
            {isReset ? 'Reset your password' : isSignUp ? 'Create your private budget' : 'Welcome back'}
          </Text>
          <Text style={styles.detail}>
            {isReset
              ? 'Enter your email and we’ll send a secure link to choose a new password.'
              : isSignUp
              ? 'Your transactions and plans stay separate from every other account.'
              : 'Sign in to see your budget on any device.'}
          </Text>
        </View>

        <View style={styles.card}>
          {isSignUp ? (
            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                autoCapitalize="words"
                autoComplete="name"
                onChangeText={setFullName}
                placeholder="Your name"
                placeholderTextColor={colors.inkMuted}
                style={styles.input}
                value={fullName}
              />
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.inkMuted}
              style={styles.input}
              value={email}
            />
          </View>

          {!isReset ? (
            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                placeholderTextColor={colors.inkMuted}
                secureTextEntry
                style={styles.input}
                value={password}
              />
              {!isSignUp ? (
                <Pressable onPress={() => changeMode('reset')} style={styles.forgotButton}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {message ? (
            <View style={[styles.message, isError ? styles.errorMessage : styles.successMessage]}>
              <MaterialCommunityIcons
                color={isError ? colors.danger : colors.primary}
                name={isError ? 'alert-circle-outline' : 'email-check-outline'}
                size={20}
              />
              <Text style={[styles.messageText, isError && styles.errorText]}>{message}</Text>
            </View>
          ) : null}

          <Pressable
            disabled={!canSubmit || busy}
            onPress={submit}
            style={[styles.primaryButton, (!canSubmit || busy) && styles.buttonDisabled]}
          >
            {busy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isReset ? 'Send reset link' : isSignUp ? 'Create account' : 'Sign in'}
              </Text>
            )}
          </Pressable>
        </View>

        {isReset ? (
          <Pressable onPress={() => changeMode('signIn')} style={styles.switchButton}>
            <Text style={styles.switchLink}>Back to sign in</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => changeMode(isSignUp ? 'signIn' : 'signUp')} style={styles.switchButton}>
            <Text style={styles.switchText}>
              {isSignUp ? 'Already have an account? ' : 'New here? '}
              <Text style={styles.switchLink}>{isSignUp ? 'Sign in' : 'Create an account'}</Text>
            </Text>
          </Pressable>
        )}

        <View style={styles.privacyRow}>
          <MaterialCommunityIcons color={colors.primary} name="shield-lock-outline" size={18} />
          <Text style={styles.privacyText}>Private by default. Your financial data is never shared with other users.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, paddingVertical: spacing.xxl, gap: spacing.xl },
  brandRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  brandMark: { borderRadius: radius.md, height: 56, width: 56 },
  brandName: { color: colors.ink, fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  brandLine: { color: colors.inkMuted, fontSize: 12, marginTop: 2 },
  intro: { gap: spacing.sm },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  title: { color: colors.ink, fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  detail: { color: colors.inkMuted, fontSize: 15, lineHeight: 22 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.lg, padding: spacing.xl, ...shadow },
  field: { gap: spacing.sm },
  label: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.ink, fontSize: 16, height: 54, paddingHorizontal: spacing.lg },
  forgotButton: { alignSelf: 'flex-end', paddingVertical: 2 },
  forgotText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  message: { alignItems: 'flex-start', borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  successMessage: { backgroundColor: colors.primarySoft },
  errorMessage: { backgroundColor: '#FBEAEA' },
  messageText: { color: colors.primaryDark, flex: 1, fontSize: 12, lineHeight: 18 },
  errorText: { color: colors.danger },
  primaryButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, height: 54, justifyContent: 'center' },
  buttonDisabled: { opacity: 0.4 },
  primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  switchButton: { alignItems: 'center', padding: spacing.sm },
  switchText: { color: colors.inkMuted, fontSize: 14 },
  switchLink: { color: colors.primary, fontWeight: '800' },
  privacyRow: { alignItems: 'flex-start', alignSelf: 'center', flexDirection: 'row', gap: spacing.sm, maxWidth: 310 },
  privacyText: { color: colors.inkMuted, flex: 1, fontSize: 11, lineHeight: 16 },
});
