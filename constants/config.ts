export const SYNC_INTERVAL_MS = 5 * 60 * 1000;
export const FILTERED_TX_LIMIT = 500;
export const TOAST_SUCCESS_MS = 3000;
// Delay so dismiss animation finishes before tearing down state
export const DISCARD_MODAL_DELAY_MS = 300;
export const SAVE_SUCCESS_DISPLAY_MS = 2000;
export const TOAST_OFFLINE_SAVE_MS = 2500;
export const TOAST_RECONNECT_MS = 3000;
// Rapid mutations collapse into a single pull at the end
export const FULL_SYNC_DELAY_MS = 1000;
// Normal syncs converge in 1-2 iterations; this is a safety ceiling
export const MAX_SYNC_ATTEMPTS = 10;
// Gap spacing between sort_order values — matches Actual Budget's convention
export const SORT_GAP = 16384;
export const ENTITLEMENT_PRO = 'Ledger Pro';
export const FREE_WRITES_PER_MONTH = 5;
