import {
  FieldValue,
  Timestamp,
  Timestamp as AdminTimestamp,
  type DocumentReference,
  type Firestore,
} from "./firestoreRest.js";

import {
  CONTACT_DEDUPE_MS,
  CONTACT_MAX_SUBMISSIONS_PER_WINDOW,
  CONTACT_RATE_WINDOW_MS,
  CONTACT_STALE_RESERVATION_MS,
} from "./guardsConstants.js";
import { ContactHttpError } from "./httpError.js";

const COL_DEDUPE = "_svcContactDedupe";
const COL_RATE = "_svcContactRate";

export type ReserveOutcome =
  | { kind: "duplicate_silent" }
  | {
      kind: "reserved";
      dedupeRef: DocumentReference;
      rateRef: DocumentReference;
    };

export async function reserveContactSlot(
  db: Firestore,
  params: {
    submissionKey: string;
    clientKey: string;
    nowMs: number;
  },
): Promise<ReserveOutcome> {
  const dedupeRef = db.collection(COL_DEDUPE).doc(params.submissionKey);
  const rateRef = db.collection(COL_RATE).doc(params.clientKey);

  return db.runTransaction(async (tx) => {
    const dedupeSnap = await tx.get(dedupeRef);
    const now = params.nowMs;

    if (dedupeSnap.exists) {
      const d = dedupeSnap.data() ?? {};
      const sentTs = d["sentAt"] as Timestamp | undefined;
      const sentAt = typeof sentTs?.toMillis === "function" ? sentTs.toMillis() : 0;
      const reserving = d["reserving"] === true;
      const reservedTs = d["reservedAt"] as Timestamp | undefined;
      const reservedAt =
        typeof reservedTs?.toMillis === "function" ? reservedTs.toMillis() : 0;

      if (sentAt > 0 && now - sentAt < CONTACT_DEDUPE_MS) {
        return { kind: "duplicate_silent" };
      }
      if (
        reserving &&
        reservedAt > 0 &&
        now - reservedAt < CONTACT_STALE_RESERVATION_MS
      ) {
        throw new ContactHttpError(
          429,
          "Please wait a moment before retrying.",
        );
      }
    }

    const rateSnap = await tx.get(rateRef);
    const r = rateSnap.data() ?? {};
    const windowTs = r["windowStart"] as Timestamp | undefined;
    const windowStartMs =
      typeof windowTs?.toMillis === "function" ? windowTs.toMillis() : 0;
    let count = typeof r["count"] === "number" && Number.isFinite(r["count"]) ? r["count"] : 0;

    let windowStart = windowStartMs;
    if (windowStartMs === 0 || now - windowStartMs >= CONTACT_RATE_WINDOW_MS) {
      windowStart = now;
      count = 0;
    }

    const nextCount = count + 1;
    if (nextCount > CONTACT_MAX_SUBMISSIONS_PER_WINDOW) {
      throw new ContactHttpError(
        429,
        "Too many messages from this network. Please try again later.",
      );
    }

    tx.set(
      dedupeRef,
      {
        reserving: true,
        reservedAt: FieldValue.serverTimestamp(),
      },
      { merge: false },
    );

    tx.set(
      rateRef,
      {
        count: nextCount,
        windowStart: AdminTimestamp.fromMillis(windowStart),
      },
      { merge: false },
    );

    return { kind: "reserved", dedupeRef, rateRef };
  });
}

export async function finalizeSuccessfulContact(dedupeRef: DocumentReference): Promise<void> {
  await dedupeRef.set(
    {
      reserving: false,
      sentAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function rollbackContactReservation(
  db: Firestore,
  dedupeRef: DocumentReference,
  rateRef: DocumentReference,
): Promise<void> {
  try {
    await db.runTransaction(async (tx) => {
      tx.delete(dedupeRef);
      const rs = await tx.get(rateRef);
      if (!rs.exists) return;
      const data = rs.data() ?? {};
      const count =
        typeof data["count"] === "number" && Number.isFinite(data["count"])
          ? data["count"]
          : 1;
      const windowStart = data["windowStart"] as Timestamp | undefined;
      const next = Math.max(0, count - 1);
      if (next <= 0) {
        tx.delete(rateRef);
        return;
      }
      tx.set(
        rateRef,
        {
          count: next,
          windowStart: windowStart ?? FieldValue.serverTimestamp(),
        },
        { merge: false },
      );
    });
  } catch {
    // Best-effort rollback — avoids throwing secondary errors to callers.
  }
}
