import React, { useMemo } from 'react';
import {
  Canvas,
  Path,
  Circle,
  LinearGradient,
  Shadow,
  vec,
  Skia,
} from '@shopify/react-native-skia';

interface SkiaSparklineProps {
  data: number[];
  width: number;
  height: number;
  lineColor: string;
  fillGradient: [string, string];
  strokeWidth?: number;
  showDot?: boolean;
  dotRadius?: number;
  padding?: number;
}

function computeControlPoints(pts: { x: number; y: number }[]) {
  const n = pts.length;
  if (n < 2) return [];
  const controls: { cp1: { x: number; y: number }; cp2: { x: number; y: number } }[] = [];

  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];

    const t = 0.3; // tension
    const cp1x = p1.x + (p2.x - p0.x) * t;
    const cp1y = p1.y + (p2.y - p0.y) * t;
    const cp2x = p2.x - (p3.x - p1.x) * t;
    const cp2y = p2.y - (p3.y - p1.y) * t;

    controls.push({
      cp1: { x: cp1x, y: cp1y },
      cp2: { x: cp2x, y: cp2y },
    });
  }
  return controls;
}

export function SkiaSparkline({
  data,
  width,
  height,
  lineColor,
  fillGradient,
  strokeWidth = 2,
  showDot = true,
  dotRadius = 3,
  padding = 4,
}: SkiaSparklineProps) {
  // Expand the canvas by this amount on all four sides so Skia doesn't clip
  // the dot's shadow. outer circle = dotRadius + 3, shadow blur = 6.
  const glow = showDot ? dotRadius + 3 + 6 : 0;

  const { linePath, fillPath, lastPoint } = useMemo(() => {
    if (data.length < 2) return { linePath: null, fillPath: null, lastPoint: null };

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const drawH = height - padding * 2;

    // All coordinates are offset by `glow` so they sit in the expanded canvas
    const pts = data.map((v, i) => ({
      x: glow + (i / (data.length - 1)) * width,
      y: glow + padding + drawH - ((v - min) / range) * drawH,
    }));

    const controls = computeControlPoints(pts);

    // Build line path
    const line = Skia.Path.Make();
    line.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < controls.length; i++) {
      const { cp1, cp2 } = controls[i];
      line.cubicTo(cp1.x, cp1.y, cp2.x, cp2.y, pts[i + 1].x, pts[i + 1].y);
    }

    // Build fill path (closed at the visual bottom edge)
    const fill = Skia.Path.Make();
    fill.addPath(line);
    fill.lineTo(pts[pts.length - 1].x, glow + height);
    fill.lineTo(pts[0].x, glow + height);
    fill.close();

    return {
      linePath: line,
      fillPath: fill,
      lastPoint: pts[pts.length - 1],
    };
  }, [data, width, height, padding, glow]);

  if (!linePath || !fillPath || !lastPoint) return null;

  const lineColor4 = Skia.Color(lineColor);
  const canvasW = width + glow * 2;
  const canvasH = height + glow * 2;

  return (
    <Canvas
      style={{
        width: canvasW,
        height: canvasH,
        // Pull the extra canvas space back into the layout so nothing shifts
        marginHorizontal: -glow,
        marginVertical: -glow,
      }}
    >
      {/* Gradient area fill */}
      <Path path={fillPath} style="fill">
        <LinearGradient
          start={vec(0, glow)}
          end={vec(0, glow + height)}
          colors={fillGradient}
        />
      </Path>

      {/* Smooth line stroke */}
      <Path
        path={linePath}
        style="stroke"
        strokeWidth={strokeWidth}
        strokeCap="round"
        strokeJoin="round"
        color={lineColor4}
      />

      {/* Glowing last-point dot */}
      {showDot && (
        <>
          <Circle cx={lastPoint.x} cy={lastPoint.y} r={dotRadius + 3} color={lineColor}>
            <Shadow dx={0} dy={0} blur={6} color={lineColor} />
          </Circle>
          <Circle cx={lastPoint.x} cy={lastPoint.y} r={dotRadius} color={lineColor} />
        </>
      )}
    </Canvas>
  );
}
