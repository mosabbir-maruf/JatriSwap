import { PUBLIC_AVATAR_PATHS } from "./catalog";

/** Uniform random choice from the shipped public avatar set (call once per signup when none selected). */
export function pickRandomPublicAvatarPath(): string {
  const list = PUBLIC_AVATAR_PATHS;
  if (list.length === 0) return "";
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const idx = buf[0]! % list.length;
  return list[idx]!;
}
