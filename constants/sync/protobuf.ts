export function encodeVarint(n: number): number[] {
  const out: number[] = [];
  while (n > 0x7f) {
    out.push((n & 0x7f) | 0x80);
    n = Math.floor(n / 128);
  }
  out.push(n & 0x7f);
  return out;
}

export function encodeStringField(fieldNumber: number, s: string): number[] {
  const bytes = Array.from(new TextEncoder().encode(s));
  return [
    ...encodeVarint((fieldNumber << 3) | 2),
    ...encodeVarint(bytes.length),
    ...bytes,
  ];
}

export function encodeBytesField(fieldNumber: number, bytes: Uint8Array): number[] {
  return [
    ...encodeVarint((fieldNumber << 3) | 2),
    ...encodeVarint(bytes.length),
    ...Array.from(bytes),
  ];
}

export function encodeMessageContent(
  dataset: string,
  row: string,
  column: string,
  value: string,
): Uint8Array {
  return new Uint8Array([
    ...encodeStringField(1, dataset),
    ...encodeStringField(2, row),
    ...encodeStringField(3, column),
    ...encodeStringField(4, value),
  ]);
}

export function encodeMessageEnvelope(timestamp: string, content: Uint8Array): Uint8Array {
  return new Uint8Array([...encodeStringField(1, timestamp), ...encodeBytesField(3, content)]);
}

// SyncRequest field numbers (from packages/crdt/src/proto/sync.proto):
//   1 = messages, 2 = fileId, 3 = groupId, 5 = keyId, 6 = since
export function encodeSyncRequest(fileId: string, groupId: string, since: string): Uint8Array {
  return new Uint8Array([
    ...encodeStringField(2, fileId),
    ...encodeStringField(3, groupId),
    ...encodeStringField(5, ''),
    ...encodeStringField(6, since),
  ]);
}

type PbVal = Uint8Array | number;

function readVarint(b: Uint8Array, p: number): [value: number, next: number] {
  let value = 0,
    shift = 0;
  while (p < b.length) {
    const byte = b[p++];
    value += (byte & 0x7f) * 2 ** shift;
    shift += 7;
    if (!(byte & 0x80)) break;
  }
  return [value, p];
}

export function parseProto(b: Uint8Array): Map<number, PbVal[]> {
  const m = new Map<number, PbVal[]>();
  let p = 0;
  while (p < b.length) {
    let tag: number;
    [tag, p] = readVarint(b, p);
    if (!tag) break;

    const fieldNum = tag >>> 3;
    const wireType = tag & 7;
    if (!m.has(fieldNum)) m.set(fieldNum, []);
    const arr = m.get(fieldNum)!;

    if (wireType === 0) {
      let v: number;
      [v, p] = readVarint(b, p);
      arr.push(v);
    } else if (wireType === 2) {
      let len: number;
      [len, p] = readVarint(b, p);
      if (p + len > b.length) break;
      arr.push(b.slice(p, p + len));
      p += len;
    } else if (wireType === 1) {
      p += 8;
    } else if (wireType === 5) {
      p += 4;
    } else {
      break;
    }
  }
  return m;
}

export function pbStr(m: Map<number, PbVal[]>, field: number): string {
  const v = m.get(field)?.[0];
  return v instanceof Uint8Array ? new TextDecoder().decode(v) : '';
}

export function pbBool(m: Map<number, PbVal[]>, field: number): boolean {
  const v = m.get(field)?.[0];
  return typeof v === 'number' && v !== 0;
}

export function pbAllBytes(m: Map<number, PbVal[]>, field: number): Uint8Array[] {
  return (m.get(field) ?? []).filter((v): v is Uint8Array => v instanceof Uint8Array);
}

// CRDT value codec: "0:" → null, "N:<num>" → number, "S:<str>" → string
export function decodeCrdtValue(raw: string): string | number | null {
  if (raw.length >= 2 && raw[1] === ':') {
    if (raw[0] === '0') return null;
    if (raw[0] === 'N') return parseFloat(raw.slice(2));
    if (raw[0] === 'S') return raw.slice(2);
  }
  return raw || null;
}

export function encodeCrdtValue(v: string | number | null): string {
  if (v === null || v === undefined) return '0:';
  if (typeof v === 'number') return `N:${v}`;
  return `S:${v}`;
}
