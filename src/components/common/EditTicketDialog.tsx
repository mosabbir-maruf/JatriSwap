import React, { useState, useEffect } from "react";
import { Ticket } from "@/src/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateTicket } from "@/src/lib/firebase/tickets";
import { toast } from "sonner";
import { STATIONS, TRANSPORTS, SEAT_CLASSES } from "@/src/constants";
import { Train, BusFront } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditTicketDialogProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/** Prefer mode implied by predefined transport name so toggle matches the listing even if `mode` on the doc is stale. */
function resolveEditMode(ticket: Ticket): Ticket["mode"] {
  const byName = TRANSPORTS.find((x) => x.name === ticket.transportName);
  if (byName) return byName.mode as Ticket["mode"];
  if (ticket.mode === "bus" || ticket.mode === "train") return ticket.mode;
  return "train";
}

export function EditTicketDialog({ ticket, isOpen, onClose, onSuccess }: EditTicketDialogProps) {
  const [formData, setFormData] = useState<Partial<Ticket>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleChange = (field: keyof Ticket, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleModeChange = (mode: Ticket["mode"]) => {
    setFormData((prev) => ({
      ...prev,
      mode,
      transportName: "",
      transportType: "",
    }));
  };

  /** Toggle + list reflect saved ticket until `useEffect` writes `formData.mode`. */
  const uiMode: Ticket["mode"] =
    formData.mode === "bus"
      ? "bus"
      : formData.mode === "train"
        ? "train"
        : ticket
          ? resolveEditMode(ticket)
          : "train";

  const handleTransportPick = (name: string) => {
    const entry = TRANSPORTS.find((t) => t.name === name && t.mode === uiMode);
    setFormData((prev) => ({
      ...prev,
      mode: uiMode,
      transportName: name,
      transportType: entry?.type ?? "",
    }));
  };

  const transportsForMode = TRANSPORTS.filter((t) => t.mode === uiMode);

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

    if (!formData.seatClass?.trim() || !SEAT_CLASSES.includes(formData.seatClass)) {
      toast.error("Select a seat class (AC Snigdha, Shovan, etc.).");
      return;
    }

    const pax = Number(formData.passengerCount);
    if (!Number.isFinite(pax) || pax < 1 || pax > 20) {
      toast.error("Enter passenger count between 1 and 20.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateTicket(ticket.id, {
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
        additionalNotes: (formData.additionalNotes ?? '').trim(),
      });
      toast.success("Ticket updated successfully.");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error("Failed to update ticket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const seatClassValue =
    formData.seatClass && SEAT_CLASSES.includes(formData.seatClass)
      ? formData.seatClass
      : undefined;

  return (
    <Dialog
      open={isOpen}
      modal="trap-focus"
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className="sm:max-w-[480px] border-4 border-foreground rounded-none shadow-[8px_8px_0_0_rgba(0,0,0,1)] bg-background max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading font-black text-2xl uppercase tracking-tighter">Edit Ticket</DialogTitle>
        </DialogHeader>
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
                        {t.name}{" "}
                        <span className="text-muted-foreground normal-case">({t.type})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="font-mono text-[10px] uppercase tracking-widest font-bold">From</Label>
                <Select value={formData.from} onValueChange={(v) => handleChange("from", v)}>
                  <SelectTrigger className="rounded-none border-2 border-foreground">
                    <SelectValue placeholder="From" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                    {STATIONS.map((s) => (
                      <SelectItem key={s} value={s} className="font-mono text-xs uppercase cursor-pointer hover:bg-muted">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="font-mono text-[10px] uppercase tracking-widest font-bold">To</Label>
                <Select value={formData.to} onValueChange={(v) => handleChange("to", v)}>
                  <SelectTrigger className="rounded-none border-2 border-foreground">
                    <SelectValue placeholder="To" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                    {STATIONS.map((s) => (
                      <SelectItem key={s} value={s} className="font-mono text-xs uppercase cursor-pointer hover:bg-muted">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
             <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="font-mono text-[10px] uppercase tracking-widest font-bold">Seat class (AC / coach)</Label>
                <Select
                  value={seatClassValue}
                  onValueChange={(v) => handleChange("seatClass", v)}
                >
                  <SelectTrigger className="rounded-none border-2 border-foreground min-h-10 font-mono font-bold text-xs uppercase">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                    {SEAT_CLASSES.map((c) => (
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
