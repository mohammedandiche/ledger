import type { Ionicons } from '@expo/vector-icons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export interface TabDef {
  route: string;
  label: string;
  icon: IoniconsName;
  iconFocused: IoniconsName;
}

export const PRIMARY_TABS: TabDef[] = [
  { route: 'budget', label: 'Budget', icon: 'wallet-outline', iconFocused: 'wallet' },
  // Center slot is the Add FAB — not in this array
  { route: 'ledger', label: 'Ledger', icon: 'receipt-outline', iconFocused: 'receipt' },
];

export const SECONDARY_TABS: TabDef[] = [
  { route: 'accounts', label: 'Accounts', icon: 'card-outline', iconFocused: 'card' },
  { route: 'payees', label: 'Payees', icon: 'people-outline', iconFocused: 'people' },
  { route: 'settings', label: 'Settings', icon: 'settings-outline', iconFocused: 'settings' },
];

export const ADD_ROUTE = 'add';

export const BAR_HEIGHT = 64;

export const TRAY_HEIGHT = 58;

export const FAB_SIZE = 48;

export const HANDLE_WIDTH = 32;
export const HANDLE_HEIGHT = 4;

export const SEPARATOR_HEIGHT = 1;

export const EXPAND_SPRING = { damping: 22, stiffness: 280, mass: 0.9 };

export const FLING_VELOCITY = 500;

export const DRAG_THRESHOLD = 30;

export const COLLAPSE_DELAY_MS = 400;

export const TRAY_STAGGER_MS = 40;

export const TAB_PRESS_MS = 60;
