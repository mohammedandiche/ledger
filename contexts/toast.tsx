import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Toast always renders on opaque dark backgrounds regardless of app theme
import { darkColors, Typography } from '@/constants/tokens';
import { useR } from '@/hooks/useR';

export type ToastVariant = 'error' | 'success' | 'warning' | 'info';

export interface ToastOptions {
  duration?: number;
  sticky?: boolean;
  id?: string;
  button?: { label: string; onPress: () => void };
}

interface InternalToast {
  internalId: string;
  dedupeId?: string;
  message: string;
  variant: ToastVariant;
  duration: number;
  sticky: boolean;
  button?: { label: string; onPress: () => void };
}

interface ToastCtxValue {
  addToast: (message: string, variant?: ToastVariant, options?: ToastOptions) => void;
  removeToastById: (dedupeId: string) => void;
}

const ToastCtx = createContext<ToastCtxValue>({
  addToast: () => {},
  removeToastById: () => {},
});

let counter = 0;

const VARIANT_BG: Record<ToastVariant, string> = {
  error: 'rgba(155,50,38,0.97)',
  success: 'rgba(62,128,80,0.97)',
  warning: 'rgba(176,112,30,0.97)',
  info: 'rgba(60,100,132,0.97)',
};

const VARIANT_ACCENT: Record<ToastVariant, string> = {
  error: darkColors.redL,
  success: darkColors.greenL,
  warning: darkColors.amberL,
  info: darkColors.blue,
};

function Toast({
  toast,
  onDismiss,
}: {
  toast: InternalToast;
  onDismiss: (internalId: string) => void;
}) {
  const { r } = useR();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    onDismiss(toast.internalId);
  }, [toast.internalId, onDismiss]);

  React.useEffect(() => {
    if (!toast.sticky) {
      timerRef.current = setTimeout(dismiss, toast.duration);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.sticky, toast.duration, dismiss]);

  function handleActionPress() {
    dismiss();
    setTimeout(() => toast.button?.onPress(), 100);
  }

  const accent = VARIANT_ACCENT[toast.variant];

  return (
    <MotiView
      from={{ opacity: 0, translateY: 60 }}
      animate={{ opacity: 1, translateY: 0 }}
      exit={{ opacity: 0, translateY: 50 }}
      transition={{ type: 'spring', damping: 18, stiffness: 220 }}
      exitTransition={{ type: 'timing', duration: 180 }}
    >
      <View style={[ts.toast, { backgroundColor: VARIANT_BG[toast.variant] }]}>
        <View style={[ts.indicator, { backgroundColor: accent }]} />

        <View style={ts.body}>
          <Text style={[ts.message, { fontSize: r(11, 13) }]} numberOfLines={4}>
            {toast.message}
          </Text>
          {toast.button && (
            <Pressable
              onPress={handleActionPress}
              hitSlop={8}
              style={[ts.actionBtn, { borderColor: accent }]}
            >
              <Text style={[ts.actionText, { fontSize: r(9, 11), color: accent }]}>
                {toast.button.label}
              </Text>
            </Pressable>
          )}
        </View>

        <Pressable onPress={dismiss} hitSlop={14} style={ts.closeBtn}>
          <Text style={[ts.closeText, { fontSize: r(14, 16) }]}>×</Text>
        </Pressable>
      </View>
    </MotiView>
  );
}

const MAX_TOASTS = 3;

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: InternalToast[];
  onDismiss: (internalId: string) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[ts.container, { bottom: insets.bottom + 12 }]} pointerEvents="box-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <Toast key={t.internalId} toast={t} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<InternalToast[]>([]);

  const removeToast = useCallback((internalId: string) => {
    setToasts((prev) => prev.filter((t) => t.internalId !== internalId));
  }, []);

  const removeToastById = useCallback((dedupeId: string) => {
    setToasts((prev) => prev.filter((t) => t.dedupeId !== dedupeId));
  }, []);

  const addToast = useCallback(
    (message: string, variant: ToastVariant = 'info', options: ToastOptions = {}) => {
      const { duration = 4000, sticky = false, id: dedupeId, button } = options;
      const internalId = String(++counter);

      setToasts((prev) => {
        const filtered = dedupeId ? prev.filter((t) => t.dedupeId !== dedupeId) : prev;
        const next: InternalToast[] = [
          ...filtered,
          { internalId, dedupeId, message, variant, duration, sticky, button },
        ];
        return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
      });
    },
    [],
  );

  return (
    <ToastCtx.Provider value={{ addToast, removeToastById }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}

const ts = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'column',
    gap: 8,
    pointerEvents: 'box-none',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  indicator: {
    width: 3,
    minHeight: 20,
    borderRadius: 2,
    flexShrink: 0,
    marginTop: 2,
  },
  body: {
    flex: 1,
    gap: 8,
  },
  message: {
    fontFamily: Typography.monoSB,
    color: darkColors.t0,
    lineHeight: 17,
  },
  actionBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  actionText: {
    fontFamily: Typography.monoSB,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  closeBtn: {
    flexShrink: 0,
    padding: 2,
    marginTop: -2,
  },
  closeText: {
    fontFamily: Typography.sans,
    color: 'rgba(240,232,216,0.6)',
    lineHeight: 18,
  },
});
