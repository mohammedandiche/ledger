import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { ENTITLEMENT_PRO, FREE_WRITES_PER_MONTH } from '@/constants/config';

const STORE_KEY = 'ledger_paywall_v1';

interface WriteCounter {
  monthKey: string;
  writeCount: number;
}

interface PaywallContextValue {
  isPro: boolean;
  loading: boolean;
  writeCount: number;
  writesRemaining: number;
  canWrite: boolean;
  canWriteRef: React.RefObject<boolean>;
  iapEnabled: boolean;
  recordWrite: () => void;
  showPaywall: () => void;
  restorePurchases: () => Promise<void>;
  presentCustomerCenter: () => Promise<void>;
  price: string | null;
}

const PASSTHROUGH: PaywallContextValue = {
  isPro: true,
  loading: false,
  writeCount: 0,
  writesRemaining: FREE_WRITES_PER_MONTH,
  canWrite: true,
  canWriteRef: { current: true },
  iapEnabled: false,
  recordWrite: () => {},
  showPaywall: () => {},
  restorePurchases: async () => {},
  presentCustomerCenter: async () => {},
  price: null,
};

const PaywallCtx = createContext<PaywallContextValue>(PASSTHROUGH);

function currentMonthKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

async function loadCounter(): Promise<WriteCounter> {
  try {
    const raw = await SecureStore.getItemAsync(STORE_KEY);
    if (raw) {
      const parsed: WriteCounter = JSON.parse(raw);
      if (parsed.monthKey === currentMonthKey()) return parsed;
    }
  } catch {}
  return { monthKey: currentMonthKey(), writeCount: 0 };
}

async function saveCounter(counter: WriteCounter): Promise<void> {
  await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(counter)).catch(() => {});
}

export function PaywallProvider({ children }: { children: React.ReactNode }) {
  const apiKey = Constants.expoConfig?.extra?.revenueCatApiKey as string | undefined;

  if (!apiKey) {
    return (
      <PaywallCtx.Provider value={PASSTHROUGH}>
        {children}
      </PaywallCtx.Provider>
    );
  }

  return <ActivePaywallProvider apiKey={apiKey}>{children}</ActivePaywallProvider>;
}

function ActivePaywallProvider({
  apiKey,
  children,
}: {
  apiKey: string;
  children: React.ReactNode;
}) {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [writeCount, setWriteCount] = useState(0);
  const [price, setPrice] = useState<string | null>(null);
  const [iapReady, setIapReady] = useState(false);

  const canWriteRef = useRef(true);
  const writeCountRef = useRef(0);
  const isProRef = useRef(false);

  const updateCanWrite = useCallback((pro: boolean, count: number) => {
    const allowed = pro || count < FREE_WRITES_PER_MONTH;
    canWriteRef.current = allowed;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const Purchases = (await import('react-native-purchases')).default;

        Purchases.configure({ apiKey });

        const info = await Purchases.getCustomerInfo();
        const entitled = !!info.entitlements.active[ENTITLEMENT_PRO];
        isProRef.current = entitled;
        setIsPro(entitled);

        Purchases.addCustomerInfoUpdateListener((updatedInfo) => {
          if (cancelled) return;
          const nowPro = !!updatedInfo.entitlements.active[ENTITLEMENT_PRO];
          isProRef.current = nowPro;
          setIsPro(nowPro);
          updateCanWrite(nowPro, writeCountRef.current);
        });

        try {
          const offerings = await Purchases.getOfferings();
          const pkg = offerings.current?.lifetime;
          if (pkg) setPrice(pkg.product.priceString);
        } catch {}

        setIapReady(true);

        const counter = await loadCounter();
        writeCountRef.current = counter.writeCount;
        setWriteCount(counter.writeCount);
        updateCanWrite(entitled, counter.writeCount);
      } catch {
        // Native module missing (source build with env var set) — passthrough
        isProRef.current = true;
        setIsPro(true);
        canWriteRef.current = true;
      } finally {
        setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [apiKey, updateCanWrite]);

  const recordWrite = useCallback(() => {
    if (isProRef.current) return;
    const mk = currentMonthKey();
    const next = writeCountRef.current + 1;
    writeCountRef.current = next;
    setWriteCount(next);
    updateCanWrite(false, next);
    saveCounter({ monthKey: mk, writeCount: next });
  }, [updateCanWrite]);

  const showPaywall = useCallback(async () => {
    try {
      const RevenueCatUI = (await import('react-native-purchases-ui')).default;
      await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: ENTITLEMENT_PRO,
        displayCloseButton: true,
      });
      // CustomerInfoUpdateListener handles state changes on purchase/restore
    } catch {}
  }, []);

  const restorePurchases = useCallback(async () => {
    try {
      const Purchases = (await import('react-native-purchases')).default;
      await Purchases.restorePurchases();
      // CustomerInfoUpdateListener handles state changes
    } catch {}
  }, []);

  const presentCustomerCenter = useCallback(async () => {
    try {
      const RevenueCatUI = (await import('react-native-purchases-ui')).default;
      await RevenueCatUI.presentCustomerCenter();
    } catch {}
  }, []);

  const canWrite = isPro || writeCount < FREE_WRITES_PER_MONTH;
  const writesRemaining = isPro
    ? FREE_WRITES_PER_MONTH
    : Math.max(0, FREE_WRITES_PER_MONTH - writeCount);

  const ctxValue: PaywallContextValue = {
    isPro,
    loading,
    writeCount,
    writesRemaining,
    canWrite,
    canWriteRef,
    iapEnabled: iapReady,
    recordWrite,
    showPaywall,
    restorePurchases,
    presentCustomerCenter,
    price,
  };

  return (
    <PaywallCtx.Provider value={ctxValue}>
      {children}
    </PaywallCtx.Provider>
  );
}

export function usePaywall() {
  return useContext(PaywallCtx);
}
