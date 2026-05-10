import type { AdminUserRow } from "@/src/types";

export function adminUserDisplayLabel(row: AdminUserRow | undefined, fallbackId: string): string {
  const id = fallbackId.trim();
  return row?.name?.trim() || row?.email?.trim() || id || "—";
}
