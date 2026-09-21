import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme';

export function LoadingScreen() {
  return (
    <View style={styles.container}>
      <Image accessibilityLabel="Zenify logo" source={require('../../assets/zenify-logo.jpg')} style={styles.logo} />
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.text}>Opening Zenify…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', backgroundColor: colors.background, flex: 1, gap: spacing.md, justifyContent: 'center' },
  logo: { borderRadius: 22, height: 88, marginBottom: spacing.sm, width: 88 },
  text: { color: colors.inkMuted, fontSize: 14, fontWeight: '700' },
});
