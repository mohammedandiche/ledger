import { useCallback, useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '@/contexts/auth';
import { PaywallProvider } from '@/contexts/paywall';
import { BudgetProvider } from '@/contexts/budget';
import { ToastProvider } from '@/contexts/toast';
import { ThemeProvider, useTheme } from '@/contexts/theme';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { AnimatedSplash } from '@/components/shared/AnimatedSplash';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  OverpassMono_400Regular,
  OverpassMono_500Medium,
  OverpassMono_600SemiBold,
  OverpassMono_700Bold,
} from '@expo-google-fonts/overpass-mono';
import {
  NunitoSans_400Regular,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
  NunitoSans_800ExtraBold,
  NunitoSans_900Black,
} from '@expo-google-fonts/nunito-sans';

SplashScreen.preventAutoHideAsync();

// Must be inside ThemeProvider to read from ThemeContext
function AppLayout() {
  const { resolvedTheme } = useTheme();
  return (
    <>
      <StatusBar style={resolvedTheme === 'light' ? 'dark' : 'light'} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    OverpassMono_400Regular,
    OverpassMono_500Medium,
    OverpassMono_600SemiBold,
    OverpassMono_700Bold,
    NunitoSans_400Regular,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
    NunitoSans_800ExtraBold,
    NunitoSans_900Black,
  });

  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  const handleSplashFinish = useCallback(() => setSplashDone(true), []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {fontsLoaded && (
        <ErrorBoundary>
          <ThemeProvider>
            <ToastProvider>
              <AuthProvider>
                <PaywallProvider>
                  <BudgetProvider>
                    <AppLayout />
                  </BudgetProvider>
                </PaywallProvider>
              </AuthProvider>
            </ToastProvider>
          </ThemeProvider>
        </ErrorBoundary>
      )}
      {!splashDone && (
        <AnimatedSplash ready={fontsLoaded} onFinish={handleSplashFinish} />
      )}
    </GestureHandlerRootView>
  );
}
