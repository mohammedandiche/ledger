import React, { useMemo } from 'react';
import {
  Canvas,
  RoundedRect,
  LinearGradient,
  Shadow,
  vec,
} from '@shopify/react-native-skia';

interface SkiaProgressBarProps {
  progress: number;
  color: string;
  height?: number;
  width: number;
  radius?: number;
  trackColor?: string;
}

export function SkiaProgressBar({
  progress,
  color,
  height = 2,
  width,
  radius = 1,
  trackColor = 'rgba(255,255,255,0.04)',
}: SkiaProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const fillWidth = clampedProgress * width;

  const lighterColor = useMemo(() => {
    const hex = color.replace('#', '');
    if (hex.length !== 6) return color;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const lr = Math.min(255, r + 77);
    const lg = Math.min(255, g + 77);
    const lb = Math.min(255, b + 77);
    return `rgb(${lr},${lg},${lb})`;
  }, [color]);

  if (width <= 0) return null;

  return (
    <Canvas style={{ width, height: height + 4 }}>
      <RoundedRect
        x={0}
        y={2}
        width={width}
        height={height}
        r={radius}
        color={trackColor}
      />

      {fillWidth > 0 && (
        <RoundedRect
          x={0}
          y={2}
          width={fillWidth}
          height={height}
          r={radius}
        >
          <LinearGradient
            start={vec(0, 0)}
            end={vec(fillWidth, 0)}
            colors={[color, lighterColor]}
          />
          <Shadow dx={0} dy={0} blur={3} color={color} />
        </RoundedRect>
      )}
    </Canvas>
  );
}
