/**
 * Minimal Firestore REST client — drop-in replacement for the subset of `@google-cloud/firestore`
 * that this app actually uses (single-doc get/set/delete + transactions with field transforms).
 *
 * Built directly on `fetch` + a caller-provided OAuth access-token getter so the package tree
 * stays free of `@google-cloud/firestore → google-gax`, which transitively pulled deprecated
 * `glob@10.5.0` and `node-domexception@1.0.0`. No npm `overrides` needed.
 *
 * API surface intentionally mirrors firebase-admin/firestore so existing call sites do not change:
 *
 *   db.collection("foo").doc("bar").get()
 *   db.collection("foo").doc("bar").set({ ... }, { merge: true })
 *   db.collection("foo").doc("bar").delete()
 *   db.runTransaction(async (tx) => { ... tx.get/.set/.delete ... })
 *   Timestamp.fromMillis(ms)            // class
 *   FieldValue.serverTimestamp()        // sentinel
 *
 * Only types/methods that this repo uses are implemented.
 */

// ----- Wire types -----

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { timestampValue: string }
  | { mapValue: { fields?: Record<string, FirestoreValue> } }
  | { arrayValue: { values?: FirestoreValue[] } };

interface UpdateWrite {
  update: { name: string; fields: Record<string, FirestoreValue> };
  updateMask?: { fieldPaths: string[] };
  updateTransforms?: Array<{ fieldPath: string; setToServerValue: "REQUEST_TIME" }>;
}
interface DeleteWrite {
  delete: string;
}
type FirestoreWrite = UpdateWrite | DeleteWrite;

// ----- Sentinels -----

const SENTINEL_KEY = "__firestoreSentinel" as const;
type ServerTimestampSentinel = { readonly [SENTINEL_KEY]: "serverTimestamp" };

function isServerTimestampSentinel(v: unknown): v is ServerTimestampSentinel {
  return (
    typeof v === "object" &&
    v !== null &&
    (v as { [SENTINEL_KEY]?: unknown })[SENTINEL_KEY] === "serverTimestamp"
  );
}

export const FieldValue = {
  serverTimestamp(): ServerTimestampSentinel {
    return { [SENTINEL_KEY]: "serverTimestamp" } as const;
  },
};

// ----- Timestamp -----

export class Timestamp {
  constructor(
    public readonly seconds: number,
    public readonly nanoseconds: number,
  ) {}

  toMillis(): number {
    return this.seconds * 1000 + Math.floor(this.nanoseconds / 1_000_000);
  }

  static fromMillis(ms: number): Timestamp {
    const seconds = Math.floor(ms / 1000);
    const nanoseconds = (ms - seconds * 1000) * 1_000_000;
    return new Timestamp(seconds, nanoseconds);
  }

  static fromRfc3339(s: string): Timestamp {
    const m = /^(.+?)(?:\.(\d{1,9}))?Z$/.exec(s);
    if (!m) throw new Error(`Invalid timestamp: ${s}`);
    const [, base, frac] = m;
    const epochMs = Date.parse(`${base}Z`);
    if (Number.isNaN(epochMs)) throw new Error(`Invalid timestamp: ${s}`);
    const seconds = Math.floor(epochMs / 1000);
    const nanoseconds = parseInt((frac ?? "0").padEnd(9, "0").slice(0, 9), 10);
    return new Timestamp(seconds, nanoseconds);
  }

  toRfc3339(): string {
    const base = new Date(this.seconds * 1000).toISOString().slice(0, -5);
    const nsStr = String(this.nanoseconds).padStart(9, "0");
    return `${base}.${nsStr}Z`;
  }
}

// ----- Value <-> JSON encoding -----

function encodeValue(v: unknown): FirestoreValue {
  if (v === null) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (v instanceof Timestamp) return { timestampValue: v.toRfc3339() };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) {
    return { arrayValue: { values: v.map(encodeValue) } };
  }
  if (typeof v === "object") {
    const fields: Record<string, FirestoreValue> = {};
    for (const [k, val] of Object.entries(v)) {
      if (val === undefined || isServerTimestampSentinel(val)) continue;
      fields[k] = encodeValue(val);
    }
    return { mapValue: { fields } };
  }
  throw new Error(`Cannot encode value of type ${typeof v}`);
}

function decodeValue(v: FirestoreValue): unknown {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return Timestamp.fromRfc3339(v.timestampValue);
  if ("mapValue" in v) {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v.mapValue.fields ?? {})) {
      out[k] = decodeValue(val);
    }
    return out;
  }
  if ("arrayValue" in v) {
    return (v.arrayValue.values ?? []).map(decodeValue);
  }
  return undefined;
}

function encodeFields(data: Record<string, unknown>): Record<string, FirestoreValue> {
  const out: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || isServerTimestampSentinel(v)) continue;
    out[k] = encodeValue(v);
  }
  return out;
}

function collectTransforms(
  data: Record<string, unknown>,
): Array<{ fieldPath: string; setToServerValue: "REQUEST_TIME" }> {
  const out: Array<{ fieldPath: string; setToServerValue: "REQUEST_TIME" }> = [];
  for (const [k, v] of Object.entries(data)) {
    if (isServerTimestampSentinel(v)) {
      out.push({ fieldPath: k, setToServerValue: "REQUEST_TIME" });
    }
  }
  return out;
}

// ----- Public references -----

export class DocumentSnapshot {
  constructor(
    public readonly ref: DocumentReference,
    private readonly _data: Record<string, unknown> | undefined,
  ) {}

  get exists(): boolean {
    return this._data !== undefined;
  }

  data(): Record<string, unknown> | undefined {
    return this._data;
  }
}

export class DocumentReference {
  constructor(
    private readonly client: Firestore,
    public readonly path: string,
  ) {}

  get(): Promise<DocumentSnapshot> {
    return this.client._fetchDoc(this);
  }

  set(data: Record<string, unknown>, options?: { merge?: boolean }): Promise<void> {
    return this.client._commitWrites([
      buildUpdateWrite(this.client._docResourceName(this), data, options?.merge ?? false),
    ]);
  }

  delete(): Promise<void> {
    return this.client._commitWrites([{ delete: this.client._docResourceName(this) }]);
  }
}

export class CollectionReference {
  constructor(
    private readonly client: Firestore,
    public readonly path: string,
  ) {}

  doc(id: string): DocumentReference {
    return new DocumentReference(this.client, `${this.path}/${id}`);
  }
}

// ----- Transaction -----

export class Transaction {
  private readonly buffered: FirestoreWrite[] = [];

  constructor(
    private readonly client: Firestore,
    private readonly transactionId: string,
  ) {}

  get(ref: DocumentReference): Promise<DocumentSnapshot> {
    return this.client._fetchDoc(ref, this.transactionId);
  }

  set(ref: DocumentReference, data: Record<string, unknown>, options?: { merge?: boolean }): void {
    this.buffered.push(
      buildUpdateWrite(this.client._docResourceName(ref), data, options?.merge ?? false),
    );
  }

  delete(ref: DocumentReference): void {
    this.buffered.push({ delete: this.client._docResourceName(ref) });
  }

  /** @internal */
  _drain(): FirestoreWrite[] {
    return this.buffered;
  }

  /** @internal */
  _id(): string {
    return this.transactionId;
  }
}

function buildUpdateWrite(
  name: string,
  data: Record<string, unknown>,
  merge: boolean,
): UpdateWrite {
  const fields = encodeFields(data);
  const transforms = collectTransforms(data);
  const w: UpdateWrite = { update: { name, fields } };
  if (transforms.length > 0) w.updateTransforms = transforms;
  if (merge) w.updateMask = { fieldPaths: Object.keys(fields) };
  return w;
}

// ----- Firestore client -----

export interface FirestoreClientConfig {
  projectId: string;
  databaseId: string;
  getAccessToken: () => Promise<string>;
}

export class Firestore {
  private readonly documentsBase: string;
  private readonly resourcePrefix: string;

  constructor(private readonly config: FirestoreClientConfig) {
    this.documentsBase = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      config.projectId,
    )}/databases/${encodeURIComponent(config.databaseId)}/documents`;
    this.resourcePrefix = `projects/${config.projectId}/databases/${config.databaseId}/documents`;
  }

  collection(name: string): CollectionReference {
    return new CollectionReference(this, name);
  }

  async runTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
    const transactionId = await this._beginTransaction();
    const tx = new Transaction(this, transactionId);
    try {
      const result = await fn(tx);
      await this._commitWrites(tx._drain(), transactionId);
      return result;
    } catch (err) {
      this._rollbackQuietly(transactionId);
      throw err;
    }
  }

  // ----- Internal HTTP helpers -----

  /** @internal */
  _docResourceName(ref: DocumentReference): string {
    return `${this.resourcePrefix}/${ref.path}`;
  }

  private async authedFetch(input: string, init?: RequestInit): Promise<Response> {
    const token = await this.config.getAccessToken();
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    if (init?.body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return fetch(input, { ...init, headers });
  }

  /** @internal */
  async _fetchDoc(ref: DocumentReference, transactionId?: string): Promise<DocumentSnapshot> {
    const url = new URL(`${this.documentsBase}/${ref.path}`);
    if (transactionId) url.searchParams.set("transaction", transactionId);

    const res = await this.authedFetch(url.toString());

    if (res.status === 404) return new DocumentSnapshot(ref, undefined);
    if (!res.ok) {
      throw new Error(`Firestore GET ${ref.path} failed: ${res.status} ${await res.text()}`);
    }

    const json = (await res.json()) as { fields?: Record<string, FirestoreValue> };
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(json.fields ?? {})) data[k] = decodeValue(v);
    return new DocumentSnapshot(ref, data);
  }

  /** @internal */
  async _commitWrites(writes: FirestoreWrite[], transactionId?: string): Promise<void> {
    if (writes.length === 0 && transactionId === undefined) return;
    const body: { writes: FirestoreWrite[]; transaction?: string } = { writes };
    if (transactionId) body.transaction = transactionId;

    const res = await this.authedFetch(`${this.documentsBase}:commit`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Firestore commit failed: ${res.status} ${await res.text()}`);
    }
  }

  private async _beginTransaction(): Promise<string> {
    const res = await this.authedFetch(`${this.documentsBase}:beginTransaction`, {
      method: "POST",
      body: JSON.stringify({ options: { readWrite: {} } }),
    });
    if (!res.ok) {
      throw new Error(`Firestore beginTransaction failed: ${res.status} ${await res.text()}`);
    }
    const { transaction } = (await res.json()) as { transaction: string };
    return transaction;
  }

  private _rollbackQuietly(transactionId: string): void {
    void this.authedFetch(`${this.documentsBase}:rollback`, {
      method: "POST",
      body: JSON.stringify({ transaction: transactionId }),
    }).catch(() => {
      /* best-effort */
    });
  }
}
