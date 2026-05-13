import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError } from './errors';
import { OperationType, TicketReport } from '../../types';
import { getOrLoadCached, invalidateCachedKey } from '../runtime/requestCache';

/** Stored when the reporter is not signed in (must match Firestore rules). */
export const ANONYMOUS_REPORTER_ID = 'anonymous';
const TICKET_REPORTS_CACHE_KEY = 'ticketReports:recent:100';
const TICKET_REPORTS_CACHE_TTL_MS = 20_000;

export interface CreateTicketReportInput {
  ticketId: string;
  ticketName: string;
  sellerId: string;
  sellerName: string;
  sellerPhone: string;
  reason: string;
  reporterId: string;
}

export async function createTicketReport(input: CreateTicketReportInput): Promise<string> {
  const path = 'ticketReports';
  try {
    const docRef = await addDoc(collection(db, 'ticketReports'), {
      ticketId: input.ticketId,
      ticketName: input.ticketName,
      sellerId: input.sellerId,
      sellerName: input.sellerName,
      sellerPhone: input.sellerPhone,
      reason: input.reason,
      reporterId: input.reporterId,
      createdAt: serverTimestamp(),
    });
    invalidateCachedKey(TICKET_REPORTS_CACHE_KEY);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getTicketReports(): Promise<TicketReport[]> {
  const path = 'ticketReports';
  try {
    return getOrLoadCached(TICKET_REPORTS_CACHE_KEY, TICKET_REPORTS_CACHE_TTL_MS, async () => {
      const q = query(collection(db, 'ticketReports'), orderBy('createdAt', 'desc'), limit(100));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const createdAt =
          data.createdAt?.toDate?.()?.toISOString?.() ??
          (typeof data.createdAt === 'string' ? data.createdAt : '');
        return {
          id: docSnap.id,
          ticketId: data.ticketId,
          ticketName: data.ticketName,
          sellerId: data.sellerId,
          sellerName: data.sellerName,
          sellerPhone: data.sellerPhone ?? '',
          reason: data.reason,
          reporterId: data.reporterId,
          createdAt,
        } as TicketReport;
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
