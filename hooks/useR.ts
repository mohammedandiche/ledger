import { useWindowDimensions } from 'react-native';

export const BP = { tablet: 600, large: 900 } as const;

export function useR() {
  const { width } = useWindowDimensions();
  const isTablet = width >= BP.tablet;
  const isLarge = width >= BP.large;

  const hp = isLarge ? 32 : isTablet ? 24 : 18;

  function r<T>(phone: T, tablet?: T, large?: T): T {
    if (isLarge && large !== undefined) return large;
    if (isTablet && tablet !== undefined) return tablet;
    return phone;
  }

  return { width, isTablet, isLarge, hp, r };
}
