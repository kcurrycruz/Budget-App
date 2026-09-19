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

type AuthMode = 'signIn' | 'signUp';

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const isSignUp = mode === 'signUp';
  const canSubmit = email.trim().length > 3 && password.length >= 8 && (!isSignUp || fullName.trim().length > 1);

  const changeMode = () => {
    setMode((current) => (current === 'signIn' ? 'signUp' : 'signIn'));
    setMessage(null);
    setIsError(false);
  };

  const submit = async () => {
    if (!supabase || !canSubmit || busy) return;

    setBusy(true);
    setMessage(null);
    setIsError(false);

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
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brandMark}>
          <MaterialCommunityIcons color={colors.white} name="wallet-bifold-outline" size={30} />
        </View>
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>YOUR MONEY, MADE CLEAR</Text>
          <Text style={styles.title}>{isSignUp ? 'Create your private budget' : 'Welcome back'}</Text>
          <Text style={styles.detail}>
            {isSignUp
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
          </View>

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
            {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>{isSignUp ? 'Create account' : 'Sign in'}</Text>}
          </Pressable>
        </View>

        <Pressable onPress={changeMode} style={styles.switchButton}>
          <Text style={styles.switchText}>
            {isSignUp ? 'Already have an account? ' : 'New here? '}
            <Text style={styles.switchLink}>{isSignUp ? 'Sign in' : 'Create an account'}</Text>
          </Text>
        </Pressable>

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
  brandMark: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: radius.md, height: 56, justifyContent: 'center', width: 56 },
  intro: { gap: spacing.sm },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  title: { color: colors.ink, fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  detail: { color: colors.inkMuted, fontSize: 15, lineHeight: 22 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.lg, padding: spacing.xl, ...shadow },
  field: { gap: spacing.sm },
  label: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.ink, fontSize: 16, height: 54, paddingHorizontal: spacing.lg },
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
