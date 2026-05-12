import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { PUBLIC_AVATAR_PATHS } from "@/src/lib/avatar/catalog";

export interface ProfileAvatarPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  googlePhotoUrl?: string | null;
  currentValue?: string | null;
  onPick: (displayUrl: string) => void | Promise<void>;
  title?: string;
}

function tileSelected(current: string | undefined, candidate: string): boolean {
  if (!current) return false;
  return current.trim() === candidate.trim();
}

function PickerTile({
  src,
  selected,
  onPick,
  googleLabel,
  ariaLabel,
}: {
  src: string;
  selected: boolean;
  onPick: () => void;
  googleLabel?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-label={ariaLabel}
      aria-pressed={selected}
      className={cn(
        "relative aspect-square overflow-hidden rounded-md bg-muted/40 outline-none ring-1 transition-colors",
        selected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "ring-border hover:ring-foreground/25",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
    >
      <img src={src} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
      {googleLabel ? (
        <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded bg-background/85 px-1.5 py-0.5 text-[10px] font-medium text-foreground shadow-sm backdrop-blur-sm">
          Google
        </span>
      ) : null}
    </button>
  );
}

export const ProfileAvatarPickerDialog = React.memo(function ProfileAvatarPickerDialog({
  open,
  onOpenChange,
  googlePhotoUrl,
  currentValue,
  onPick,
  title = "Photo",
}: ProfileAvatarPickerDialogProps) {
  const google = typeof googlePhotoUrl === "string" ? googlePhotoUrl.trim() : "";
  const showGoogle = google.length > 0 && (google.startsWith("http://") || google.startsWith("https://"));
  const current = (currentValue ?? "").trim() || undefined;

  const handlePick = React.useCallback(
    (url: string) => {
      void Promise.resolve(onPick(url)).catch((e: unknown) => {
        console.error("ProfileAvatarPickerDialog onPick:", e);
      });
    },
    [onPick],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "max-w-[min(100vw-1.5rem,440px)] gap-0 overflow-hidden rounded-lg border border-border bg-background p-0 shadow-lg sm:max-w-md",
        )}
      >
        <DialogHeader className="border-b border-border px-4 py-3 sm:px-5 sm:py-4">
          <DialogTitle className="text-base font-semibold tracking-tight text-foreground">{title}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 sm:py-4">
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-2.5 md:grid-cols-6">
            {showGoogle ? (
              <PickerTile
                src={google}
                selected={tileSelected(current, google)}
                onPick={() => handlePick(google)}
                googleLabel
                ariaLabel="Use Google profile photo"
              />
            ) : null}
            {PUBLIC_AVATAR_PATHS.map((path) => (
              <React.Fragment key={path}>
                <PickerTile
                  src={path}
                  selected={tileSelected(current, path)}
                  onPick={() => handlePick(path)}
                  ariaLabel={`Avatar ${path.replace("/avatar/", "")}`}
                />
              </React.Fragment>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});
