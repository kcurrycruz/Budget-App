import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme';

type ScreenHeaderProps = {
  eyebrow?: string;
  title: string;
  detail?: string;
};

export function ScreenHeader({ eyebrow, title, detail }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  eyebrow: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  detail: {
    color: colors.inkMuted,
    fontSize: 15,
    lineHeight: 21,
  },
});
