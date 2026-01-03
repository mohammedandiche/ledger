import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { Typography } from '@/constants/tokens';
import { useTheme } from '@/contexts/theme';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOADER_ANIM = require('@/assets/lottie/loader.json');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SUCCESS_ANIM = require('@/assets/lottie/success.json');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const EMPTY_ANIM = require('@/assets/lottie/empty.json');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SYNC_ANIM = require('@/assets/lottie/sync.json');

export const LottieAssets = {
  loader: LOADER_ANIM,
  success: SUCCESS_ANIM,
  empty: EMPTY_ANIM,
  sync: SYNC_ANIM,
} as const;

export type LottieAssetName = keyof typeof LottieAssets;

interface LottieLoaderProps {
  animation?: LottieAssetName | object;
  size?: number;
  autoPlay?: boolean;
  loop?: boolean;
  fallbackText?: string;
}

export function LottieLoader({
  animation = 'loader',
  size = 32,
  autoPlay = true,
  loop = true,
  fallbackText,
}: LottieLoaderProps) {
  const { colors } = useTheme();
  const source = typeof animation === 'string' ? LottieAssets[animation] : animation;

  return (
    <View style={[s.container, { width: size, height: size }]}>
      <LottieView
        source={source}
        autoPlay={autoPlay}
        loop={loop}
        style={{ width: size, height: size }}
        renderMode="SOFTWARE"
      />
      {fallbackText && (
        <Text style={[s.fallback, { color: colors.t3 }]}>{fallbackText}</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallback: {
    fontFamily: Typography.mono,
    fontSize: 9,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
