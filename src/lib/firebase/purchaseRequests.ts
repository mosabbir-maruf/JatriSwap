import {
  addDoc,
  collection,
  doc,
  DocumentData,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
  runTransaction,
  serverTimestamp,
  startAfter,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { sliceQueryDocsPage } from "./queryPageSlice";
import { BuyerPurchaseRequest, Ticket } from "../../types";

/** Must match Firestore rules for unsigned buyers logging a WhatsApp intent. */
export const ANONYMOUS_BUYER_ID = "anonymous";
const ANONYMOUS_BUYER_LABEL = "Guest via WhatsApp";

/** Deterministic id for signed-in buyers (dedupes spam taps per listing). Must stay in sync with Firestore rules. */
const PURCHASE_REQ_ID_SEP = "__pr__";

/** Overview widget on admin dashboard — fetch size + 1 row to detect “has more”. */
export const BUYER_PURCHASE_OVERVIEW_SIZE = 3;
/** Full list dialog — each “Load more” batch. */
export const BUYER_PURCHASE_ADMIN_PAGE_SIZE = 20;
export const PURCHASE_REQUESTS_ADMIN_QUERY_LIMIT = 100;

/** Seller dashboard realtime feed — newest buyer activity first. */
export const SELLER_PURCHASE_REQUESTS_SUBSCRIPTION_LIMIT = 100;

export type PurchaseRequestTicketSnapshot = Pick<
  Ticket,
  | "id"
  | "sellerId"
  | "transportName"
  | "from"
  | "to"
  | "sellingPrice"
  | "sellerPhone"
  | "departureTime"
  | "date"
  | "mode"
>;

function mapPurchaseRequestDoc(docSnap: QueryDocumentSnapshot<DocumentData>): BuyerPurchaseRequest {
  const data = docSnap.data();
  const createdAt =
    data.createdAt?.toDate?.()?.toISOString?.() ??
    (typeof data.createdAt === "string" ? data.createdAt : "");
  const lastRequestedAtRaw =
    data.lastRequestedAt?.toDate?.()?.toISOString?.() ??
    (typeof data.lastRequestedAt === "string" ? data.lastRequestedAt : "");
  const lastRequestedAt = lastRequestedAtRaw || createdAt;
  const requestCount =
    typeof data.requestCount === "number" && Number.isFinite(data.requestCount) && data.requestCount >= 1
      ? Math.floor(data.requestCount)
      : 1;
  const sellerListingPhoneRaw = data.sellerListingPhone;
  const sellerListingPhone =
    typeof sellerListingPhoneRaw === "string" && sellerListingPhoneRaw.trim().length > 0
      ? sellerListingPhoneRaw.trim()
      : undefined;

  const listingDepartureTime =
    typeof data.listingDepartureTime === "string" && data.listingDepartureTime.trim().length > 0
      ? data.listingDepartureTime.trim()
      : undefined;
  const listingTripDate =
    typeof data.listingTripDate === "string" && data.listingTripDate.trim().length > 0
      ? data.listingTripDate.trim()
      : undefined;
  const modeRaw = data.listingTransportMode;
  const listingTransportMode =
    modeRaw === "train" || modeRaw === "bus" ? (modeRaw as "train" | "bus") : undefined;

  return {
    id: docSnap.id,
    ticketId: String(data.ticketId ?? ""),
    sellerId: String(data.sellerId ?? ""),
    transportName: String(data.transportName ?? ""),
    routeFrom: String(data.routeFrom ?? ""),
    routeTo: String(data.routeTo ?? ""),
    sellingPrice: typeof data.sellingPrice === "number" ? data.sellingPrice : Number(data.sellingPrice) || 0,
    ...(sellerListingPhone !== undefined ? { sellerListingPhone } : {}),
    ...(listingDepartureTime !== undefined ? { listingDepartureTime } : {}),
    ...(listingTripDate !== undefined ? { listingTripDate } : {}),
    ...(listingTransportMode !== undefined ? { listingTransportMode } : {}),
    buyerUserId: String(data.buyerUserId ?? ""),
    buyerLabel: String(data.buyerLabel ?? ""),
    createdAt,
    requestCount,
    lastRequestedAt,
  };
}

export type RecordBuyerPurchaseRequestResult = {
  /** True only when this tap created the row (signed-in). Anonymous rows always false for notifications. */
  shouldNotifySeller: boolean;
};

function signedBuyerPurchaseDocId(ticketId: string, buyerUserId: string): string | null {
  const tid = ticketId.trim();
  const bid = buyerUserId.trim();
  if (!tid || !bid || bid === ANONYMOUS_BUYER_ID) return null;
  const id = `${tid}${PURCHASE_REQ_ID_SEP}${bid}`;
  if (id.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(id)) return null;
  return id;
}

/**
 * Persist a buyer “Request to Buy” (WhatsApp handoff). Signed-in buyers use one doc per listing (`ticketId__pr__uid`) with `requestCount` / `lastRequestedAt` so admins see accurate interest without duplicate rows; seller in-app notify fires only on first signed-in write.
 * Anonymous buyers keep `addDoc` (guest identity not stable). Never throws — failures are logged only so UX is unaffected.
 */
export async function recordBuyerPurchaseRequest(input: {
  ticket: PurchaseRequestTicketSnapshot;
  buyerUserId: string;
  buyerLabel: string;
}): Promise<RecordBuyerPurchaseRequestResult> {
  const path = "purchaseRequests";
  const { ticket, buyerUserId, buyerLabel } = input;
  const label = buyerLabel.slice(0, 200);
  /** Must match `tickets/{id}.sellerPhone` byte-for-byte for rules validation. */
  const sellerListingPhone = String(ticket.sellerPhone ?? "");
  const listingDepartureTime = String(ticket.departureTime ?? "");
  const listingTripDate = String(ticket.date ?? "");
  const listingTransportMode = ticket.mode;

  try {
    if (buyerUserId === ANONYMOUS_BUYER_ID) {
      await addDoc(collection(db, path), {
        ticketId: ticket.id,
        sellerId: ticket.sellerId,
        transportName: ticket.transportName,
        routeFrom: ticket.from,
        routeTo: ticket.to,
        sellingPrice: ticket.sellingPrice,
        sellerListingPhone,
        listingDepartureTime,
        listingTripDate,
        listingTransportMode,
        buyerUserId,
        buyerLabel: label,
        createdAt: serverTimestamp(),
        lastRequestedAt: serverTimestamp(),
        requestCount: 1,
      });
      return { shouldNotifySeller: false };
    }

    const docId = signedBuyerPurchaseDocId(ticket.id, buyerUserId);
    if (!docId) {
      console.error("[recordBuyerPurchaseRequest] invalid stable doc id", ticket.id, buyerUserId);
      return { shouldNotifySeller: false };
    }

    const ref = doc(db, path, docId);
    const shouldNotifySeller = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists()) {
        transaction.set(ref, {
          ticketId: ticket.id,
          sellerId: ticket.sellerId,
          transportName: ticket.transportName,
          routeFrom: ticket.from,
          routeTo: ticket.to,
          sellingPrice: ticket.sellingPrice,
          sellerListingPhone,
          listingDepartureTime,
          listingTripDate,
          listingTransportMode,
          buyerUserId,
          buyerLabel: label,
          createdAt: serverTimestamp(),
          lastRequestedAt: serverTimestamp(),
          requestCount: 1,
        });
        return true;
      }
      transaction.update(ref, {
        lastRequestedAt: serverTimestamp(),
        requestCount: increment(1),
        buyerLabel: label,
      });
      return false;
    });

    return { shouldNotifySeller };
  } catch (error) {
    console.error("[recordBuyerPurchaseRequest]", path, error);
    return { shouldNotifySeller: false };
  }
}

/**
 * Live purchase intents for listings owned by `sellerUid`.
 * Query must match rules: `where('sellerId','==', sellerUid)` + `orderBy('lastRequestedAt','desc')`.
 */
export function subscribeToSellerPurchaseRequests(
  sellerUid: string,
  onNext: (items: BuyerPurchaseRequest[]) => void,
): () => void {
  const path = "purchaseRequests";
  const q = query(
    collection(db, path),
    where("sellerId", "==", sellerUid),
    orderBy("lastRequestedAt", "desc"),
    limit(SELLER_PURCHASE_REQUESTS_SUBSCRIPTION_LIMIT),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      onNext(snapshot.docs.map((d) => mapPurchaseRequestDoc(d as QueryDocumentSnapshot<DocumentData>)));
    },
    (error) => {
      console.error("[subscribeToSellerPurchaseRequests]", path, error);
      onNext([]);
    },
  );
}

export function buyerPurchaseRequestLabelForWhatsAppIntent(input: {
  firebaseUid: string | undefined;
  firebaseEmail: string | null | undefined;
  firebaseDisplayName: string | null | undefined;
}): { buyerUserId: string; buyerLabel: string } {
  const uid = input.firebaseUid?.trim();
  if (!uid) {
    return { buyerUserId: ANONYMOUS_BUYER_ID, buyerLabel: ANONYMOUS_BUYER_LABEL };
  }
  const label =
    input.firebaseEmail?.trim() ||
    input.firebaseDisplayName?.trim() ||
    uid;
  return {
    buyerUserId: uid,
    buyerLabel: label.slice(0, 200),
  };
}

/**
 * Cursor page on `lastRequestedAt` desc. Requests `pageSize + 1` docs to set `hasMore` without a separate count query.
 */
export async function fetchBuyerPurchaseRequestsPage(
  pageSize: number,
  cursorDoc: QueryDocumentSnapshot<DocumentData> | null,
): Promise<{
  items: BuyerPurchaseRequest[];
  /** Pass as `cursorDoc` for the next page (last document of `items`). */
  endCursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}> {
  const path = "purchaseRequests";
  const capped = Math.min(Math.max(1, pageSize), PURCHASE_REQUESTS_ADMIN_QUERY_LIMIT);
  const fetchLimit = capped + 1;
  try {
    const snapshot = await getDocs(
      query(
        collection(db, path),
        orderBy("lastRequestedAt", "desc"),
        ...(cursorDoc ? [startAfter(cursorDoc)] : []),
        limit(fetchLimit),
      ),
    );
    return sliceQueryDocsPage(snapshot.docs, capped, mapPurchaseRequestDoc);
  } catch (error) {
    console.error("[fetchBuyerPurchaseRequestsPage]", path, error);
    return { items: [], endCursor: null, hasMore: false };
  }
}

/** First screenful for admin overview (at most `BUYER_PURCHASE_OVERVIEW_SIZE` rows + `hasMore`). */
export async function fetchBuyerPurchaseRequestsOverview(): Promise<{
  items: BuyerPurchaseRequest[];
  hasMore: boolean;
}> {
  const { items, hasMore } = await fetchBuyerPurchaseRequestsPage(BUYER_PURCHASE_OVERVIEW_SIZE, null);
  return { items, hasMore };
}

export async function getRecentBuyerPurchaseRequests(
  maxResults = PURCHASE_REQUESTS_ADMIN_QUERY_LIMIT,
): Promise<BuyerPurchaseRequest[]> {
  const { items } = await fetchBuyerPurchaseRequestsPage(
    Math.min(Math.max(1, maxResults), PURCHASE_REQUESTS_ADMIN_QUERY_LIMIT),
    null,
  );
  return items;
}
