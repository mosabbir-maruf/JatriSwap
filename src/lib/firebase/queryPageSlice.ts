import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";

/**
 * Firestore cursor pagination helper: query requests `capped + 1` docs; this trims to `capped`
 * rows and sets `hasMore` without a separate count read.
 */
export function sliceQueryDocsPage<T>(
  docs: QueryDocumentSnapshot<DocumentData>[],
  capped: number,
  mapDoc: (d: QueryDocumentSnapshot<DocumentData>) => T,
): {
  items: T[];
  endCursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
} {
  const hasMore = docs.length > capped;
  const pageDocs = hasMore ? docs.slice(0, capped) : docs;
  const items = pageDocs.map(mapDoc);
  const endCursor = pageDocs.length > 0 ? pageDocs[pageDocs.length - 1] : null;
  return { items, endCursor, hasMore };
}
