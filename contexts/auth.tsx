import React, { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import type { BudgetFile, LoginMethod } from '@/constants/server';

const STORE_KEY = 'ledger_auth_v1';

export interface AuthState {
  url: string;
  token: string | null;
  loginMethod: LoginMethod | null;
  files: BudgetFile[];
  activeFileId: string | null;
  activeFileName: string | null;
}

const DEFAULT: AuthState = {
  url: '',
  token: null,
  loginMethod: null,
  files: [],
  activeFileId: null,
  activeFileName: null,
};

type Action =
  | { type: 'HYDRATE'; payload: Partial<AuthState> }
  | { type: 'SET_URL'; url: string }
  | { type: 'CONNECTED'; method: LoginMethod; token?: string }
  | { type: 'SET_FILES'; files: BudgetFile[] }
  | { type: 'SELECT_FILE'; id: string; name: string }
  | { type: 'LOGOUT' };

function reduce(s: AuthState, a: Action): AuthState {
  switch (a.type) {
    case 'HYDRATE':
      return { ...DEFAULT, ...a.payload };
    case 'SET_URL':
      return { ...s, url: a.url };
    case 'CONNECTED':
      return { ...s, loginMethod: a.method, token: a.token ?? s.token };
    case 'SET_FILES':
      return { ...s, files: a.files };
    case 'SELECT_FILE':
      return { ...s, activeFileId: a.id, activeFileName: a.name };
    case 'LOGOUT':
      return DEFAULT;
    default:
      return s;
  }
}

interface AuthContextValue {
  state: AuthState;
  dispatch: React.Dispatch<Action>;
  isConnected: boolean;
}

const AuthCtx = createContext<AuthContextValue>({
  state: DEFAULT,
  dispatch: () => {},
  isConnected: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reduce, DEFAULT);
  const hydratedRef = useRef(false);

  useEffect(() => {
    SecureStore.getItemAsync(STORE_KEY).then((raw) => {
      if (raw) {
        try {
          dispatch({ type: 'HYDRATE', payload: JSON.parse(raw) });
        } catch {
          // Corrupted storage — reset to login screen instead of hanging forever
          dispatch({ type: 'LOGOUT' });
        }
      }
      hydratedRef.current = true;
    });
  }, []);

  // Skip persisting until hydration completes to avoid overwriting valid stored data with DEFAULT
  useEffect(() => {
    if (!hydratedRef.current) return;
    SecureStore.setItemAsync(STORE_KEY, JSON.stringify(state)).catch(() => {
      console.error('[auth] Failed to persist auth state to SecureStore');
    });
  }, [state]);

  const isConnected = !!state.token || state.loginMethod === 'header';

  return <AuthCtx.Provider value={{ state, dispatch, isConnected }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
