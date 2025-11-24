const PRIVATE_172_REGEX = /^172\.(1[6-9]|2\d|3[01])\./;

export type LoginMethod = 'password' | 'openid' | 'header';

export interface ServerInfo {
  loginMethod: LoginMethod;
  version: string;
}

export interface BudgetFile {
  fileId: string;
  groupId: string;
  name: string;
  deleted: number;
  encryptKeyId: string | null;
}

// Rejects plain HTTP unless the host is localhost or a private-network IP
export function base(url: string): string {
  const u = url.trim().replace(/\/$/, '');
  try {
    const parsed = new URL(u);
    if (parsed.protocol === 'http:') {
      const host = parsed.hostname;
      const isLocal =
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '::1' ||
        host.startsWith('10.') ||
        host.startsWith('192.168.') ||
        PRIVATE_172_REGEX.test(host);
      if (!isLocal) {
        throw new Error(
          'Refusing plain HTTP for a non-local server. Use HTTPS to protect your credentials.',
        );
      }
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.message.startsWith('Refusing')) throw e;
    throw new Error(
      `Invalid server URL "${u}". Enter a full URL including the protocol, e.g. https://budget.example.com`,
    );
  }
  return u;
}

function withTimeout(ms: number): { signal: AbortSignal; clear: () => void } {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, clear: () => clearTimeout(id) };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parseJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Server returned non-JSON (HTTP ${res.status}). Check that the URL points to an Actual Budget server.`,
    );
  }
}

export async function getServerInfo(url: string): Promise<ServerInfo> {
  const { signal, clear } = withTimeout(10_000);
  let res: Response;
  try {
    res = await fetch(`${base(url)}/info`, { signal });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.toLowerCase().includes('aborted') || msg.toLowerCase().includes('timeout')) {
      throw new Error('Connection timed out — check the URL and that the server is running.');
    }
    throw new Error(`Cannot reach server: ${msg || 'network error'}`);
  } finally {
    clear();
  }
  if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);
  const json = await parseJson(res);

  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    throw new Error('Unexpected response from /info — is this an Actual Budget server?');
  }

  // actual-server varies across versions — check all known locations
  const raw: string =
    json.config?.loginMethod ??
    json.data?.config?.loginMethod ??
    json.data?.loginMethod ??
    json.loginMethod ??
    '';
  const loginMethod: LoginMethod = /openid|oidc/i.test(raw)
    ? 'openid'
    : raw === 'header'
      ? 'header'
      : raw === 'password'
        ? 'password'
        : 'password';
  const version: string = json.build?.version ?? json.data?.build?.version ?? json.version ?? '';
  return { loginMethod, version };
}

export async function loginPassword(url: string, password: string): Promise<string> {
  const { signal, clear } = withTimeout(10_000);
  let res: Response;
  try {
    res = await fetch(`${base(url)}/account/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginMethod: 'password', password }),
      signal,
    });
  } catch (e: unknown) {
    throw new Error(`Cannot reach server: ${e instanceof Error ? e.message : 'network error'}`);
  } finally {
    clear();
  }
  const json = await parseJson(res);
  if (json.status !== 'ok' || !json.data?.token) {
    const reason = json.reason ?? json.details ?? 'unknown error';
    throw new Error(reason === 'invalid-password' ? 'Invalid password' : `Login failed: ${reason}`);
  }
  const token = json.data.token;
  if (typeof token !== 'string' || token.length === 0) {
    throw new Error('Login succeeded but the server returned an empty or invalid token.');
  }
  return token;
}

export function getOpenIdUrl(serverUrl: string, returnUrl: string): string {
  return `${base(serverUrl)}/account/login?return_url=${encodeURIComponent(returnUrl)}`;
}

export async function listFiles(url: string, token: string): Promise<BudgetFile[]> {
  const { signal, clear } = withTimeout(10_000);
  let res: Response;
  try {
    res = await fetch(`${base(url)}/sync/list-user-files`, {
      headers: token ? { 'X-ACTUAL-TOKEN': token } : {},
      signal,
    });
  } catch (e: unknown) {
    throw new Error(`Cannot reach server: ${e instanceof Error ? e.message : 'network error'}`);
  } finally {
    clear();
  }
  const json = await parseJson(res);
  if (json.status !== 'ok')
    throw new Error(`Could not load budget files: ${json.reason ?? json.details ?? 'unknown'}`);

  const rawFiles = json.data ?? json.files ?? json.data?.files;
  if (!Array.isArray(rawFiles)) {
    throw new Error(
      'Server returned an unexpected file list format. The server version may be incompatible.',
    );
  }

  const validFiles: BudgetFile[] = [];
  for (const f of rawFiles) {
    if (
      typeof f === 'object' &&
      f !== null &&
      typeof f.fileId === 'string' &&
      typeof f.name === 'string' &&
      !f.deleted
    ) {
      validFiles.push({
        fileId: f.fileId,
        groupId: typeof f.groupId === 'string' ? f.groupId : '',
        name: f.name,
        deleted: 0,
        encryptKeyId: typeof f.encryptKeyId === 'string' ? f.encryptKeyId : null,
      });
    }
  }
  return validFiles;
}
