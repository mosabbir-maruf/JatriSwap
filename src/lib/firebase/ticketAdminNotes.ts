import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError } from './errors';
import { OperationType } from '../../types';
import { clientLogger } from '../runtime/clientLogger';

export const TICKET_ADMIN_NOTE_MAX_CHARS = 4000;

/** Internal moderation notes — stored separately from public ticket docs so they are not exposed on `/ticket/:id`. */
export async function fetchTicketAdminNotesForIds(ticketIds: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(ticketIds)].filter(Boolean);
  const out: Record<string, string> = {};
  const chunkSize = 40;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (id) => {
        try {
          const snap = await getDoc(doc(db, 'ticketAdminNotes', id));
          if (snap.exists()) {
            const n = snap.data()?.note;
            if (typeof n === 'string') out[id] = n;
          }
        } catch (e: unknown) {
          clientLogger.error("ticket-admin-notes.fetch-by-id", e, { id });
        }
      }),
    );
  }
  return out;
}

export async function saveTicketAdminNote(ticketId: string, note: string, updatedByUid: string): Promise<void> {
  const path = `ticketAdminNotes/${ticketId}`;
  const trimmed = note.slice(0, TICKET_ADMIN_NOTE_MAX_CHARS);
  try {
    await setDoc(
      doc(db, 'ticketAdminNotes', ticketId),
      {
        note: trimmed,
        updatedAt: serverTimestamp(),
        updatedByUid,
      },
      { merge: true },
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
