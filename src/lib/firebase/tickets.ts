import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  onSnapshot,
  increment,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError } from './errors';
import { sliceQueryDocsPage } from './queryPageSlice';
import { OperationType, Ticket } from '../../types';

/** Cap for public/marketing ticket subscriptions (reduces read blast radius). */
export const TICKETS_SUBSCRIPTION_CAP = 200;
/** Page size for Browse pagination. */
export const TICKETS_PAGE_SIZE = 60;
/** Soft cap for admin bulk reads when no cursor is used. */
export const TICKETS_ADMIN_QUERY_LIMIT = 500;
/** Admin overview strip — fetch size + 1 row for `hasMore`. */
export const TICKETS_ADMIN_RECENT_OVERVIEW_SIZE = 3;
/** Admin “Recent Ticket Posts” dialog — each Load more batch. */
export const TICKETS_ADMIN_RECENT_DIALOG_PAGE_SIZE = 20;

function buildTicketsPostedAtConstraints(
  filters: TicketListFilters | undefined,
  cursor: QueryDocumentSnapshot<DocumentData> | null,
  fetchLimit: number,
): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];
  if (filters?.mode) constraints.push(where('mode', '==', filters.mode));
  if (filters?.from) constraints.push(where('from', '==', filters.from));
  if (filters?.to) constraints.push(where('to', '==', filters.to));
  if (filters?.status) constraints.push(where('status', '==', filters.status));
  constraints.push(orderBy('postedAt', 'desc'));
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(limit(fetchLimit));
  return constraints;
}

/** Normalize Firestore Timestamp / ISO string for sorting (matches Browse behavior). */
export function ticketPostedAtMs(t: Pick<Ticket, 'postedAt'>): number {
  const p = t.postedAt as unknown;
  if (p != null && typeof p === 'object') {
    const o = p as { toMillis?: () => number; seconds?: number };
    if (typeof o.toMillis === 'function') return o.toMillis();
    if (typeof o.seconds === 'number') return o.seconds * 1000;
  }
  if (typeof p === 'string') return new Date(p).getTime();
  return 0;
}

export interface TicketListFilters {
  mode?: 'train' | 'bus';
  from?: string;
  to?: string;
  status?: string;
}

export const getTickets = async (
  filters?: TicketListFilters & { maxResults?: number },
): Promise<Ticket[]> => {
  const path = 'tickets';
  try {
    const maxResults = filters?.maxResults ?? TICKETS_ADMIN_QUERY_LIMIT;
    const lim = Math.min(maxResults, TICKETS_ADMIN_QUERY_LIMIT);
    const snapshot = await getDocs(
      query(collection(db, 'tickets'), ...buildTicketsPostedAtConstraints(filters, null, lim)),
    );
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Ticket));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

/** Cursor-based pagination (orderBy postedAt desc). */
export async function fetchTicketsPage(
  pageSize: number,
  filters: TicketListFilters | undefined,
  cursor: QueryDocumentSnapshot<DocumentData> | null,
): Promise<{ tickets: Ticket[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
  const path = 'tickets';
  const safeLimit = Math.min(Math.max(pageSize, 1), TICKETS_ADMIN_QUERY_LIMIT);
  try {
    const snapshot = await getDocs(
      query(collection(db, 'tickets'), ...buildTicketsPostedAtConstraints(filters, cursor, safeLimit)),
    );
    const docs = snapshot.docs;
    const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;
    return {
      tickets: docs.map((d) => ({ id: d.id, ...d.data() } as Ticket)),
      lastDoc,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Admin recent-posts listing: same ordering/filters as Browse pagination but requests `pageSize + 1`
 * docs to derive `hasMore` without a count query.
 */
export async function fetchTicketsPostedAtAdminPage(
  pageSize: number,
  cursor: QueryDocumentSnapshot<DocumentData> | null,
  filters?: TicketListFilters,
): Promise<{
  tickets: Ticket[];
  endCursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}> {
  const path = 'tickets';
  const capped = Math.min(Math.max(1, pageSize), TICKETS_ADMIN_QUERY_LIMIT);
  const fetchLimit = capped + 1;
  try {
    const snapshot = await getDocs(
      query(collection(db, path), ...buildTicketsPostedAtConstraints(filters, cursor, fetchLimit)),
    );
    const { items: tickets, endCursor, hasMore } = sliceQueryDocsPage(
      snapshot.docs,
      capped,
      (d) => ({ id: d.id, ...d.data() } as Ticket),
    );
    return { tickets, endCursor, hasMore };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchTicketsRecentOverview(
  filters?: TicketListFilters,
): Promise<{ tickets: Ticket[]; hasMore: boolean }> {
  const { tickets, hasMore } = await fetchTicketsPostedAtAdminPage(
    TICKETS_ADMIN_RECENT_OVERVIEW_SIZE,
    null,
    filters,
  );
  return { tickets, hasMore };
}

export const getTicket = async (ticketId: string): Promise<Ticket | null> => {
  const path = `tickets/${ticketId}`;
  try {
    const docRef = doc(db, 'tickets', ticketId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Ticket;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

export const createTicket = async (
  userId: string,
  data: Omit<Ticket, 'id' | 'sellerId' | 'postedAt' | 'status'>,
): Promise<string> => {
  const path = 'tickets';
  try {
    const docRef = await addDoc(collection(db, 'tickets'), {
      ...data,
      sellerId: userId,
      status: 'available',
      postedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateTicketStatus = async (ticketId: string, status: Ticket['status']): Promise<void> => {
  const path = `tickets/${ticketId}`;
  try {
    const docRef = doc(db, 'tickets', ticketId);
    await updateDoc(docRef, { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const updateTicket = async (
  ticketId: string,
  data: Partial<Omit<Ticket, 'id' | 'sellerId' | 'postedAt'>>,
): Promise<void> => {
  const path = `tickets/${ticketId}`;
  try {
    const docRef = doc(db, 'tickets', ticketId);
    await updateDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteTicket = async (ticketId: string): Promise<void> => {
  const path = `tickets/${ticketId}`;
  try {
    await deleteDoc(doc(db, 'ticketAdminNotes', ticketId)).catch(() => {});
    await deleteDoc(doc(db, 'tickets', ticketId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

/** Admin read-only: seller's listings (single-field query + client sort; avoids compound index). */
export async function fetchTicketsBySellerIdForAdmin(sellerId: string): Promise<Ticket[]> {
  const path = 'tickets';
  try {
    const snapshot = await getDocs(
      query(collection(db, 'tickets'), where('sellerId', '==', sellerId), limit(200)),
    );
    const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Ticket));
    rows.sort((a, b) => ticketPostedAtMs(b) - ticketPostedAtMs(a));
    return rows;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/** Public-safe counter bump (+1 views); rules allow only exactly-one increments without auth. */
export const incrementTicketViews = async (ticketId: string): Promise<void> => {
  const path = `tickets/${ticketId}`;
  try {
    const docRef = doc(db, 'tickets', ticketId);
    await updateDoc(docRef, { views: increment(1) });
  } catch (error) {
    console.error('Failed to increment views:', error);
  }
};

export const subscribeToTickets = (
  callback: (tickets: Ticket[]) => void,
  filters?: { mode?: 'train' | 'bus'; from?: string; to?: string },
  options?: { maxDocuments?: number },
): (() => void) => {
  const path = 'tickets';
  const cap = options?.maxDocuments ?? TICKETS_SUBSCRIPTION_CAP;
  const constraints: QueryConstraint[] = [];
  if (filters?.mode) constraints.push(where('mode', '==', filters.mode));
  if (filters?.from) constraints.push(where('from', '==', filters.from));
  if (filters?.to) constraints.push(where('to', '==', filters.to));
  constraints.push(orderBy('postedAt', 'desc'));
  constraints.push(limit(cap));

  const q = query(collection(db, 'tickets'), ...constraints);

  return onSnapshot(
    q,
    (snapshot) => {
      const tickets = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Ticket));
      callback(tickets);
    },
    (error) => {
      console.error('[subscribeToTickets]', path, error);
      callback([]);
    },
  );
};

/** Seller dashboard: only tickets owned by this user (bounded). */
export const subscribeToSellerTickets = (
  sellerId: string,
  callback: (tickets: Ticket[]) => void,
  options?: { maxDocuments?: number },
): (() => void) => {
  const path = 'tickets';
  const cap = options?.maxDocuments ?? 120;
  /** When compound query fails (e.g. missing index), fetch up to this many rows and sort client-side. */
  const fallbackFetchLimit = TICKETS_ADMIN_QUERY_LIMIT;

  const mapDocs = (snapshot: QuerySnapshot<DocumentData>): Ticket[] =>
    snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Ticket));

  const applyFallbackSorted = (snapshot: QuerySnapshot<DocumentData>) => {
    const rows = mapDocs(snapshot);
    rows.sort((a, b) => ticketPostedAtMs(b) - ticketPostedAtMs(a));
    callback(rows.slice(0, cap));
  };

  const qOrdered = query(
    collection(db, 'tickets'),
    where('sellerId', '==', sellerId),
    orderBy('postedAt', 'desc'),
    limit(cap),
  );

  const qFallback = query(
    collection(db, 'tickets'),
    where('sellerId', '==', sellerId),
    limit(fallbackFetchLimit),
  );

  let cleanup: () => void;

  const orderedUnsub = onSnapshot(
    qOrdered,
    (snapshot) => {
      callback(mapDocs(snapshot));
    },
    (error) => {
      console.error('[subscribeToSellerTickets]', path, error);
      orderedUnsub();
      cleanup = onSnapshot(
        qFallback,
        applyFallbackSorted,
        (err2) => {
          console.error('[subscribeToSellerTickets] fallback', path, err2);
          callback([]);
        },
      );
    },
  );

  cleanup = orderedUnsub;
  return () => cleanup();
};
