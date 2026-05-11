import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Ticket, type TicketStatus } from "@/src/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateTicket } from "@/src/lib/firebase/tickets";
import { ListingWriteBlockedError } from "@/src/lib/listingWriteGuard";
import { normalizeUserAccountStatus, sellListingBlockedMessage } from "@/src/lib/userAccountStatus";
import { useAuth } from "@/src/contexts/AuthContext";
import { toast } from "sonner";
import { STATIONS, TRANSPORTS, seatClassesForMode } from "@/src/constants";
import { Train, BusFront } from "lucide-react";
import { cn } from "@/lib/utils";

const ADMIN_LISTING_STATUSES = [
  "available",
  "sold",
  "pending",
  "expired",
  "flagged",
  "rejected",
] as const satisfies readonly TicketStatus[];

const ADMIN_LISTING_STATUS_SET = new Set<TicketStatus>(ADMIN_LISTING_STATUSES);

function normalizeAdminListingStatus(
  formStatus: TicketStatus | undefined,
  savedStatus: TicketStatus | undefined,
): TicketStatus {
  if (formStatus && ADMIN_LISTING_STATUS_SET.has(formStatus)) return formStatus;
  if (savedStatus && ADMIN_LISTING_STATUS_SET.has(savedStatus)) return savedStatus;
  return "available";
}

interface EditTicketDialogProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  /** Called after Firestore update succeeds; receives the edited ticket id (stable for parent callbacks). */
  onSuccess?: (ticketId: string) => void;
  /** Admin dashboard: same form as sellers plus listing status. */
  showListingStatus?: boolean;
}

/** Prefer mode implied by predefined transport name so toggle matches the listing even if `mode` on the doc is stale. */
function resolveEditMode(ticket: Ticket): Ticket["mode"] {
  const byName = TRANSPORTS.find((x) => x.name === ticket.transportName);
  if (byName) return byName.mode as Ticket["mode"];
  if (ticket.mode === "bus" || ticket.mode === "train") return ticket.mode;
  return "train";
}

const StationSelect = React.memo(function StationSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label className="font-mono text-[10px] uppercase tracking-widest font-bold">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="rounded-none border-2 border-foreground">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent className="rounded-none border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
          {STATIONS.map((s) => (
            <SelectItem key={s} value={s} className="font-mono text-xs uppercase cursor-pointer hover:bg-muted">
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});

export function EditTicketDialog({
  ticket,
  isOpen,
  onClose,
  onSuccess,
  showListingStatus = false,
}: EditTicketDialogProps) {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState<Partial<Ticket>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [listingGuardMessage, setListingGuardMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setListingGuardMessage("");
  }, [isOpen, ticket?.id]);

  useEffect(() => {
    if (!ticket || !isOpen) return;

    const mode = resolveEditMode(ticket);
    const namesForMode = new Set(
      TRANSPORTS.filter((t) => t.mode === mode).map((t) => t.name),
    );
    const nameValid = Boolean(ticket.transportName && namesForMode.has(ticket.transportName));
    const matched =
      nameValid
        ? TRANSPORTS.find((t) => t.name === ticket.transportName && t.mode === mode)
        : undefined;

    setFormData({
      ...ticket,
      mode,
      transportName: nameValid ? ticket.transportName : "",
      transportType: matched?.type ?? (nameValid ? ticket.transportType : ""),
    });
  }, [ticket, isOpen]);

  const handleChange = useCallback((field: keyof Ticket, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleFromStationChange = useCallback((v: string) => handleChange("from", v), [handleChange]);
  const handleToStationChange = useCallback((v: string) => handleChange("to", v), [handleChange]);

  const handleModeChange = useCallback((mode: Ticket["mode"]) => {
    setFormData((prev) => ({
      ...prev,
      mode,
      transportName: "",
      transportType: "",
    }));
  }, []);

  /** Toggle + list reflect saved ticket until `useEffect` writes `formData.mode`. */
  const uiMode: Ticket["mode"] =
    formData.mode === "bus"
      ? "bus"
      : formData.mode === "train"
        ? "train"
        : ticket
          ? resolveEditMode(ticket)
          : "train";

  const handleTransportPick = useCallback(
    (name: string) => {
      const entry = TRANSPORTS.find((t) => t.name === name && t.mode === uiMode);
      setFormData((prev) => ({
        ...prev,
        mode: uiMode,
        transportName: name,
        transportType: entry?.type ?? "",
      }));
    },
    [uiMode],
  );

  const transportsForMode = useMemo(() => TRANSPORTS.filter((t) => t.mode === uiMode), [uiMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;

    const mode = formData.mode === "bus" || formData.mode === "train" ? formData.mode : resolveEditMode(ticket);
    const picked = TRANSPORTS.find(
      (t) => t.name === formData.transportName && t.mode === mode,
    );
    if (!formData.transportName?.trim() || !picked) {
      toast.error("Select a train or bus from the list.");
      return;
    }

    const seatOpts = seatClassesForMode(mode);
    if (!formData.seatClass?.trim() || !seatOpts.includes(formData.seatClass)) {
      toast.error(
        mode === "bus"
          ? "Select a bus class (AC, Non-AC, Scania, etc.)."
          : "Select a train seat class (Shovan, Snigdha, etc.).",
      );
      return;
    }

    const pax = Number(formData.passengerCount);
    if (!Number.isFinite(pax) || pax < 1 || pax > 20) {
      toast.error("Enter passenger count between 1 and 20.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Parameters<typeof updateTicket>[1] = {
        mode,
        transportName: picked.name,
        transportType: picked.type,
        from: formData.from,
        to: formData.to,
        departureTime: formData.departureTime,
        seatClass: formData.seatClass,
        passengerCount: pax,
        seatNumber: formData.seatNumber,
        originalPrice: formData.originalPrice ? Number(formData.originalPrice) : undefined,
        sellingPrice: formData.sellingPrice ? Number(formData.sellingPrice) : undefined,
        additionalNotes: (formData.additionalNotes ?? "").trim(),
      };
      if (showListingStatus) {
        payload.status = normalizeAdminListingStatus(formData.status, ticket.status);
      }

      await updateTicket(ticket.id, payload);
      toast.success("Ticket updated successfully.");
      onSuccess?.(ticket.id);
      onClose();
    } catch (error) {
      if (error instanceof ListingWriteBlockedError) {
        setListingGuardMessage(
          sellListingBlockedMessage(normalizeUserAccountStatus(currentUser?.status)),
        );
        return;
      }
      toast.error("Failed to update ticket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const seatOptionsForUi = seatClassesForMode(uiMode);
  const seatClassValue =
    formData.seatClass && seatOptionsForUi.includes(formData.seatClass)
      ? formData.seatClass
      : undefined;

  return (
    <Dialog
      open={isOpen}
      modal="trap-focus"
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[720px] border-4 border-foreground rounded-none shadow-[8px_8px_0_0_rgba(0,0,0,1)] bg-background max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading font-black text-2xl uppercase tracking-tighter">Edit Ticket</DialogTitle>
        </DialogHeader>
        {listingGuardMessage ? (
          <div className="rounded-none border-2 border-destructive bg-destructive/10 p-4 space-y-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-foreground leading-relaxed">
              {listingGuardMessage}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              render={<Link to="/contact" className="inline-flex items-center justify-center" />}
              className="rounded-none border-2 border-foreground font-mono text-[10px] uppercase font-bold w-full sm:w-auto"
            >
              Contact support
            </Button>
          </div>
        ) : null}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label className="font-mono text-[10px] uppercase tracking-widest font-bold">Transport mode</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleModeChange("train")}
                  className={cn(
                    "flex items-center justify-center gap-2 h-11 rounded-none border-2 font-mono font-bold text-[10px] uppercase shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition-all hover:translate-y-px hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]",
                    uiMode === "train"
                      ? "border-foreground bg-foreground text-background"
                      : "border-foreground bg-background text-foreground",
                  )}
                >
                  <Train className="w-4 h-4 shrink-0" aria-hidden />
                  Train
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("bus")}
                  className={cn(
                    "flex items-center justify-center gap-2 h-11 rounded-none border-2 font-mono font-bold text-[10px] uppercase shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition-all hover:translate-y-px hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]",
                    uiMode === "bus"
                      ? "border-foreground bg-foreground text-background"
                      : "border-foreground bg-background text-foreground",
                  )}
                >
                  <BusFront className="w-4 h-4 shrink-0" aria-hidden />
                  Bus
                </button>
              </div>
            </div>

            <div className="grid gap-2" key={`transport-block-${uiMode}`}>
              <Label className="font-mono text-[10px] uppercase tracking-widest font-bold">Transport name</Label>
              <Select
                value={formData.transportName?.trim() ? formData.transportName : undefined}
                onValueChange={handleTransportPick}
              >
                <SelectTrigger className="rounded-none border-2 border-foreground font-mono font-bold text-xs uppercase min-h-10">
                  <SelectValue placeholder={`Select ${uiMode === "bus" ? "bus" : "train"}`} />
                </SelectTrigger>
                <SelectContent className="rounded-none border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                  {transportsForMode.map((t) => (
                    <SelectItem
                      key={`${t.mode}-${t.name}`}
                      value={t.name}
                      className="font-mono text-xs uppercase cursor-pointer hover:bg-muted"
                    >
                      <span className="flex items-center gap-2">
                        {t.mode === "bus" ? (
                          <BusFront className="w-4 h-4 shrink-0" aria-hidden />
                        ) : (
                          <Train className="w-4 h-4 shrink-0" aria-hidden />
                        )}
                        {t.name}
                        {t.mode === "train" ? (
                          <>
                            {" "}
                            <span className="text-muted-foreground normal-case">({t.type})</span>
                          </>
                        ) : null}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <StationSelect label="From" value={formData.from} onChange={handleFromStationChange} />
              <StationSelect label="To" value={formData.to} onChange={handleToStationChange} />
            </div>
            
             <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2" key={`edit-seat-${uiMode}`}>
                <Label className="font-mono text-[10px] uppercase tracking-widest font-bold">Seat class (AC / coach)</Label>
                <Select
                  value={seatClassValue}
                  onValueChange={(v) => handleChange("seatClass", v)}
                >
                  <SelectTrigger className="rounded-none border-2 border-foreground min-h-10 font-mono font-bold text-xs uppercase">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent
                    alignItemWithTrigger={false}
                    className="rounded-none border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                  >
                    {seatOptionsForUi.map((c) => (
                      <SelectItem key={c} value={c} className="font-mono text-xs uppercase cursor-pointer hover:bg-muted">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="font-mono text-[10px] uppercase tracking-widest font-bold">Passengers</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={formData.passengerCount ?? ""}
                  onChange={(e) =>
                    handleChange(
                      "passengerCount",
                      e.target.value === "" ? undefined : Number(e.target.value),
                    )
                  }
                  className="rounded-none border-2 border-foreground font-mono font-bold text-xs"
                  placeholder="1"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="font-mono text-[10px] uppercase tracking-widest font-bold">Seat number(s)</Label>
              <Input
                value={formData.seatNumber || ""}
                onChange={(e) => handleChange("seatNumber", e.target.value)}
                className="rounded-none border-2 border-foreground font-mono text-xs uppercase"
                placeholder="e.g. KA-14, KA-15"
              />
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                Separate multiple seats with commas
              </p>
            </div>

            <div className="grid gap-2">
              <Label className="font-mono text-[10px] uppercase tracking-widest font-bold">Additional notes</Label>
              <Textarea
                value={formData.additionalNotes ?? ''}
                onChange={(e) => handleChange('additionalNotes', e.target.value)}
                placeholder="Optional info for buyers"
                className="min-h-[100px] rounded-none border-2 border-foreground font-mono text-xs resize-none"
              />
            </div>

            {showListingStatus && ticket ? (
              <div className="grid gap-2">
                <Label className="font-mono text-[10px] uppercase tracking-widest font-bold">Listing status</Label>
                <Select
                  value={normalizeAdminListingStatus(formData.status, ticket.status)}
                  onValueChange={(v) => handleChange("status", v as TicketStatus)}
                >
                  <SelectTrigger className="rounded-none border-2 border-foreground min-h-10 font-mono font-bold text-xs uppercase">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                    {ADMIN_LISTING_STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="font-mono text-xs uppercase cursor-pointer hover:bg-muted">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="font-mono text-[10px] uppercase tracking-widest font-bold">Original Price</Label>
                <Input
                  type="number"
                  value={formData.originalPrice || ""}
                  onChange={(e) => handleChange("originalPrice", e.target.value)}
                  className="rounded-none border-2 border-foreground"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label className="font-mono text-[10px] uppercase tracking-widest font-bold">Selling Price</Label>
                <Input
                  type="number"
                  value={formData.sellingPrice || ""}
                  onChange={(e) => handleChange("sellingPrice", e.target.value)}
                  className="rounded-none border-2 border-foreground"
                  required
                />
              </div>
            </div>
            
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-none font-mono text-[10px] uppercase tracking-widest font-bold border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all">Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-none font-mono text-[10px] uppercase tracking-widest font-bold border-2 border-foreground bg-primary text-primary-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all">
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
