import { StyleSheet, View } from 'react-native';

import { colors, radius } from '../theme';

type ProgressBarProps = {
  value: number;
  color?: string;
  height?: number;
};

export function ProgressBar({ value, color = colors.primary, height = 8 }: ProgressBarProps) {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(value, 1)) : 0;

  return (
    <View style={[styles.track, { height }]}>
      <View style={[styles.fill, { backgroundColor: color, width: `${safeValue * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    borderRadius: radius.pill,
    height: '100%',
  },
});
