import { Loader2 } from "lucide-react";

/** Shared full-screen spinner while auth / Firestore user doc resolves. */
export function AuthLoadingPlaceholder() {
  return (
    <div className="flex-1 bg-background min-h-screen pt-32 flex flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
      <p className="font-mono text-[10px] uppercase tracking-widest font-bold">Loading session…</p>
      <span className="sr-only">Loading account session</span>
    </div>
  );
}
