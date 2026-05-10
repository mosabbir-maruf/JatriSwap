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

/** Stored when the reporter is not signed in (must match Firestore rules). */
export const ANONYMOUS_REPORTER_ID = 'anonymous';

export interface CreateTicketReportInput {
  ticketId: string;
  ticketName: string;
  sellerId: string;
  sellerName: string;
  sellerPhone: string;
  reason: string;
  reporterId: string;
}

export async function createTicketReport(input: CreateTicketReportInput): Promise<void> {
  const path = 'ticketReports';
  try {
    await addDoc(collection(db, 'ticketReports'), {
      ticketId: input.ticketId,
      ticketName: input.ticketName,
      sellerId: input.sellerId,
      sellerName: input.sellerName,
      sellerPhone: input.sellerPhone,
      reason: input.reason,
      reporterId: input.reporterId,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getTicketReports(): Promise<TicketReport[]> {
  const path = 'ticketReports';
  try {
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
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
