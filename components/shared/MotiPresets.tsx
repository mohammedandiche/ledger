import React from 'react';
import { MotiView, AnimatePresence } from 'moti';
import type { ViewStyle } from 'react-native';

export { AnimatePresence };

interface FadeInViewProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  offset?: number;
  duration?: number;
  delay?: number;
}

export function FadeInView({
  children,
  style,
  offset = 12,
  duration = 200,
  delay = 0,
}: FadeInViewProps) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: offset }}
      animate={{ opacity: 1, translateY: 0 }}
      exit={{ opacity: 0, translateY: offset }}
      transition={{ type: 'timing', duration, delay }}
      style={style}
    >
      {children}
    </MotiView>
  );
}

interface StaggerItemProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  index: number;
  stagger?: number;
  duration?: number;
  offset?: number;
}

export function StaggerItem({
  children,
  style,
  index,
  stagger = 20,
  duration = 180,
  offset = 8,
}: StaggerItemProps) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: offset }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration, delay: index * stagger }}
      style={style}
    >
      {children}
    </MotiView>
  );
}

interface PulseViewProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  active: boolean;
  peakScale?: number;
  duration?: number;
}

export function PulseView({
  children,
  style,
  active,
  peakScale = 1.6,
  duration = 500,
}: PulseViewProps) {
  return (
    <MotiView
      animate={{ scale: active ? peakScale : 1 }}
      transition={
        active
          ? { type: 'timing', duration, loop: true, repeatReverse: true }
          : { type: 'spring', damping: 15, stiffness: 150 }
      }
      style={style}
    >
      {children}
    </MotiView>
  );
}
