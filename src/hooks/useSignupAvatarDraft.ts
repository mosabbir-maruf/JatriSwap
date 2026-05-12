import { useCallback, useRef, useState } from "react";
import { pickRandomPublicAvatarPath } from "@/src/lib/avatar";

/**
 * Email/password signup: one stable random default (ref) unless the user overrides via the picker.
 */
export function useSignupAvatarDraft() {
  const defaultRandomRef = useRef<string | null>(null);
  if (defaultRandomRef.current === null) {
    defaultRandomRef.current = pickRandomPublicAvatarPath();
  }
  const [manualChoice, setManualChoice] = useState<string | null>(null);
  const effectiveAvatarPath = manualChoice ?? defaultRandomRef.current!;
  const setPickedAvatar = useCallback((path: string) => {
    setManualChoice(path);
  }, []);
  return { effectiveAvatarPath, setPickedAvatar, previewPath: effectiveAvatarPath };
}
