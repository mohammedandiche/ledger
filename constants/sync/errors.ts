export type SyncErrorKind =
  | 'network'
  | 'auth'
  | 'token-expired'
  | 'out-of-sync'
  | 'file-has-reset'
  | 'file-has-new-key'
  | 'file-not-found'
  | 'file-needs-upload'
  | 'file-old-version'
  | 'clock-drift'
  | 'apply-failure'
  | 'server';

export class SyncError extends Error {
  kind: SyncErrorKind;
  constructor(kind: SyncErrorKind, detail?: string) {
    const messages: Record<SyncErrorKind, string> = {
      network: 'Sync failed — check your network connection',
      auth: 'Sync failed — session expired, please reconnect',
      'token-expired': 'Session expired — please reconnect',
      'out-of-sync': 'Your data is out of sync with the server',
      'file-has-reset': 'Sync has been reset on this cloud file',
      'file-has-new-key': 'A new sync key is active on this cloud file',
      'file-not-found': 'Budget file not found on the server',
      'file-needs-upload': 'Budget file needs to be uploaded to the server',
      'file-old-version': 'Sync format updated — a sync reset is required',
      'clock-drift': 'Sync failed — device time differs too much from the server',
      'apply-failure': 'Sync failed — could not apply some changes',
      server: `Server error during sync${detail ? ` (${detail})` : ''}`,
    };
    super(messages[kind]);
    this.kind = kind;
    this.name = 'SyncError';
  }
}

export async function parseServerErrorKind(res: Response): Promise<SyncErrorKind> {
  if (res.status === 401 || res.status === 403) {
    try {
      const json = await res.json();
      if (json?.reason === 'token-expired') return 'token-expired';
    } catch {}
    return 'auth';
  }

  try {
    const json = await res.json();
    const reason: string = json?.reason ?? json?.error ?? '';

    const KNOWN_REASONS: Record<string, SyncErrorKind> = {
      'token-expired': 'token-expired',
      'out-of-sync': 'out-of-sync',
      'file-has-reset': 'file-has-reset',
      'file-has-new-key': 'file-has-new-key',
      'file-not-found': 'file-not-found',
      'file-needs-upload': 'file-needs-upload',
      'file-old-version': 'file-old-version',
      'clock-drift': 'clock-drift',
      'apply-failure': 'apply-failure',
    };
    if (reason in KNOWN_REASONS) return KNOWN_REASONS[reason];

    if (reason) {
      console.warn(`[sync] Unknown server error reason: "${reason}" (HTTP ${res.status})`);
    }
  } catch {}

  if (res.status === 400 || res.status === 422) return 'out-of-sync';

  return 'server';
}
