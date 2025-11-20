import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { themes, type ThemeName, type ThemeColors } from '@/constants/tokens';

export type ThemePref = 'system' | ThemeName;

interface ThemeContextValue {
  colors: ThemeColors;
  themePref: ThemePref;
  resolvedTheme: ThemeName;
  setThemePref: (pref: ThemePref) => void;
}

const STORE_KEY = 'ledger_theme_pref_v1';

const validPrefs: ThemePref[] = ['system', ...(Object.keys(themes) as ThemeName[])];

function isValidPref(v: string | null): v is ThemePref {
  return validPrefs.includes(v as ThemePref);
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: themes.dark,
  themePref: 'system',
  resolvedTheme: 'dark',
  setThemePref: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themePref, setThemePrefState] = useState<ThemePref>('system');

  useEffect(() => {
    SecureStore.getItemAsync(STORE_KEY)
      .then((v) => {
        if (isValidPref(v)) setThemePrefState(v);
      })
      .catch(() => {});
  }, []);

  function setThemePref(pref: ThemePref) {
    setThemePrefState(pref);
    SecureStore.setItemAsync(STORE_KEY, pref).catch(() => {});
  }

  const resolvedTheme: ThemeName =
    themePref === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : themePref;

  const colors = themes[resolvedTheme];

  const value = useMemo<ThemeContextValue>(
    () => ({ colors, themePref, resolvedTheme, setThemePref }),
    [colors, themePref, resolvedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
