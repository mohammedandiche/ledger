import type { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const revenueCatKey = process.env.REVENUECAT_IOS_API_KEY;

  const plugins: ExpoConfig['plugins'] = [
    'expo-router',
    'expo-secure-store',
    'expo-sqlite',
  ];

  return {
    ...config,
    name: 'Ledger',
    slug: 'ledger',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    splash: {
      backgroundColor: '#110E09',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.andiche.ledger',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: 'com.andiche.ledger',
    },
    scheme: 'ledger',
    experiments: {
      typedRoutes: true,
    },
    plugins,
    extra: {
      router: {},
      eas: {
        projectId: '357b26a9-63ea-42ef-a0ea-5e97bb10af28',
      },
      ...(revenueCatKey && { revenueCatApiKey: revenueCatKey }),
    },
    owner: 'mohammedandiche',
  };
};
