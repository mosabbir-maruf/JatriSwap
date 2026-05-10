import * as React from "react"
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { formatDepartureTimeDisplay } from "@/src/lib/formatDepartureTime";
import { MapPin, Train, BusFront, Edit2, Trash2, CheckCircle2, AlertTriangle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";
import type { Ticket as TicketModel } from "@/src/types";
import {
  canSellerDeleteListing,
  canSellerEditListingFields,
  canSellerMarkSold,
  isSellerListingModerationLocked,
} from "@/src/lib/sellerListingControls";

interface TicketProps {
  ticket: TicketModel & { status?: string };
  mode?: "default" | "seller";
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onMarkSold?: (id: string) => void;
  fromDashboard?: boolean;
}

export const TicketCard: React.FC<TicketProps> = ({ ticket, mode = "default", onEdit, onDelete, onMarkSold, fromDashboard = false }) => {

  const computedExpired = new Date() > new Date(`${ticket.date}T${ticket.departureTime || '00:00'}`) || ticket.status === "expired";
  const isSold = ticket.status === "sold";
  const isExpired = computedExpired && !isSold; // If it's sold, it's sold. If not sold and past date or set to expired, it's expired.
  const isAvailable = (ticket.status === "available" || ticket.status === "active") && !isExpired && !isSold;
  const isPending = ticket.status === "pending" && !isExpired && !isSold;
  const isRejected = ticket.status === "rejected" && !isExpired && !isSold;
  const isFlagged = ticket.status === "flagged" && !isExpired && !isSold;
  const moderationLocked = isSellerListingModerationLocked(ticket.status);
  const showSellerEdit = mode === "seller" && canSellerEditListingFields(ticket.status);
  const showSellerMarkSold = mode === "seller" && canSellerMarkSold(ticket.status);
  const showSellerDelete = mode === "seller" && canSellerDeleteListing(ticket.status);

  /** Flagged/rejected: read-only slab — no overlay link, no pointer interaction; same dim/grayscale as expired. */
  const sellerHardLocked = mode === "seller" && (isFlagged || isRejected);

  /** Inactive marketplace rows (sold/expired) plus seller flagged/rejected — matches expired card treatment. */
  const dimInactiveListing =
    (!isAvailable && !isPending && !isRejected && !isFlagged) || sellerHardLocked;

  const showTicketDetailLink =
    (isAvailable || mode === "seller" || fromDashboard) && !sellerHardLocked;

  return (
    <div
      className={cn(
        "relative group mt-4 flex h-full w-full flex-col bg-background transition-transform sm:mt-0",
        isAvailable && "hover:-translate-y-1",
        sellerHardLocked && "pointer-events-none cursor-not-allowed select-none",
      )}
      aria-disabled={sellerHardLocked ? true : undefined}
    >
      {mode === "seller" && (
          <div className="absolute -top-3 -right-3 z-40 flex items-center gap-1 font-mono text-[10px] font-bold text-foreground bg-[#FFFF00] px-2 py-1 border-2 border-foreground shadow-[2px_2px_0_0_rgb(0,0,0)]" title="Views">
            <Eye className="w-3 h-3"/> {ticket.views || 0}
          </div>
      )}
      {/* Grayscale here only — parent filter would wash out status/red UI below (CSS limitation). */}
      <div className={cn("flex flex-1 flex-col", dimInactiveListing && "opacity-60 grayscale")}>
      {/* Outer border container acting as the ticket clipping */}
      <div className="border border-foreground flex flex-col sm:flex-row overflow-hidden shadow-[4px_4px_0_0_rgb(0,0,0)] flex-1">
        
        {/* Main Ticket Body */}
        <div className="flex-1 p-6 relative bg-background flex flex-col justify-between h-full">
          
          {/* Header Row */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex gap-3">
              <div className="mt-1">
                {ticket.mode === 'bus' ? <BusFront className="w-5 h-5 text-foreground" /> : <Train className="w-5 h-5 text-foreground" />}
              </div>
              <div>
                <h3 className="font-heading font-black text-2xl uppercase tracking-tighter text-foreground leading-none mb-1">{ticket.transportName}</h3>
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{ticket.transportType}</p>
              </div>
            </div>
          </div>

          {/* Time & Route Info */}
          <div className="flex items-center justify-between mt-auto">
             <div className="flex flex-col">
               <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1"><MapPin className="w-3 h-3"/> Depart</span>
               <span className="font-heading font-bold text-4xl tracking-tighter">{formatDepartureTimeDisplay(ticket.departureTime)}</span>
             </div>
             
             {/* Divider Graphic */}
             <div className="flex-1 flex flex-col items-center justify-center px-4 relative opacity-80 min-w-0">
                <span className="font-mono text-xs uppercase font-black tracking-widest truncate max-w-full">{ticket.from}</span>
                <div className="w-full flex items-center justify-center relative my-2">
                   <div className="w-full border-t-2 border-dashed border-foreground/30 absolute"></div>
                   <div className="bg-background px-2 relative z-10 font-mono text-[8px] uppercase tracking-widest font-black text-muted-foreground">TO</div>
                </div>
                <span className="font-mono text-xs uppercase font-black tracking-widest truncate max-w-full">{ticket.to}</span>
             </div>
          </div>
        </div>

        {/* Perforated Divider */}
        <div className="w-full sm:w-px h-px sm:h-auto border-t sm:border-t-0 sm:border-l border-dashed border-foreground relative my-0 shrink-0 bg-background">
        </div>

        {/* Stub Section */}
        <div className="w-full sm:w-[130px] bg-muted/20 p-4 flex sm:flex-col justify-between items-center sm:items-stretch relative border-t sm:border-t-[0] border-foreground/5 h-full">
           
           <div className="w-full flex sm:flex-col items-center sm:items-stretch justify-around sm:justify-start space-x-4 sm:space-x-0 sm:space-y-4">
             <div className="text-left sm:text-center sm:border-b border-foreground/10 pb-0 sm:pb-2 flex-1 sm:flex-none">
               <span className="block font-mono text-[8px] uppercase tracking-widest text-muted-foreground mb-1">Date</span>
               <span className="block font-mono text-xs font-bold leading-tight">{format(new Date(ticket.date), "dd MMM")}</span>
               <span className="block font-mono text-[9px]">{format(new Date(ticket.date), "yyyy")}</span>
             </div>
             
             <div className="text-left sm:text-center sm:border-b border-foreground/10 pb-0 sm:pb-2 flex-1 sm:flex-none">
               <span className="block font-mono text-[8px] uppercase tracking-widest text-muted-foreground mb-1">Class</span>
               <span className="block font-mono text-xs font-bold leading-tight">{ticket.seatClass}</span>
             </div>

             <div className="text-left sm:text-center flex-1 sm:flex-none">
               <span className="block font-mono text-[8px] uppercase tracking-widest text-muted-foreground mb-1">Seat</span>
               <span className="block font-mono text-xs uppercase font-bold tracking-wider">{ticket.seatNumber}</span>
             </div>
           </div>

           <div className="mt-0 sm:mt-auto text-right sm:text-center flex-1 sm:flex-none w-full flex flex-col justify-end pt-4">
              <span className="block font-heading text-xl font-black text-primary tracking-tighter">
                ৳{(ticket.sellingPrice + 20).toFixed(2)}
              </span>
           </div>

        </div>
      </div>
      </div>

      {/* Bottom Bar Info — outside grayscale wrapper so badges stay red/destructive */}
      <div className="bg-foreground text-background py-2 px-4 flex justify-between items-center border-[1px] border-foreground shadow-[4px_4px_0_0_rgb(0,0,0)] mt-0 translate-y-[-1px] rounded-b-none shrink-0 min-h-[44px] relative z-30">
        <div className="font-mono text-[8px] sm:text-[10px] uppercase tracking-widest font-bold flex items-center gap-3 flex-1">
           <span className="opacity-70 break-all w-24 sm:w-auto">ID: {ticket.id}</span>
           <div className="bg-white p-0.5 rounded-sm">
             <QRCodeSVG value={`${window.location.origin}/ticket/${ticket.id}`} size={32} />
           </div>
        </div>
        
        {mode === "seller" ? (
          <div className="flex items-center gap-1">
            {isAvailable && <span className="bg-primary text-primary-foreground px-2 py-0.5 font-mono text-[8px] font-black uppercase tracking-widest">Active</span>}
            {isPending && <span className="bg-amber-500 text-amber-950 px-2 py-0.5 font-mono text-[8px] font-black uppercase tracking-widest">Pending</span>}
            {isFlagged && (
              <span className="bg-red-600 text-white px-2 py-0.5 font-mono text-[8px] font-black uppercase tracking-widest border border-red-900 shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                Flagged
              </span>
            )}
            {isRejected && (
              <span className="bg-red-600 text-white px-2 py-0.5 font-mono text-[8px] font-black uppercase tracking-widest border border-red-900 shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                Rejected
              </span>
            )}
            {isSold && <span className="bg-muted text-muted-foreground border border-muted-foreground px-2 py-0.5 font-mono text-[8px] font-black uppercase tracking-widest">Sold</span>}
            {isExpired && <span className="bg-muted text-muted-foreground border border-muted-foreground px-2 py-0.5 font-mono text-[8px] font-black uppercase tracking-widest">Expired</span>}
          </div>
        ) : (
          <div>
            {isAvailable ? (
              <span className="bg-primary text-primary-foreground px-3 py-1 font-mono text-[10px] font-black uppercase tracking-widest shadow-[2px_2px_0_0_rgba(255,255,255,0.3)]">
                Available
              </span>
            ) : isExpired ? (
              <span className="bg-red-900 text-red-100 border border-red-900 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-widest">
                Expired
              </span>
            ) : (
              <span className="bg-muted text-muted-foreground border border-muted-foreground px-3 py-1 font-mono text-[10px] font-black uppercase tracking-widest">
                Sold
              </span>
            )}
          </div>
        )}
      </div>

      {mode === "seller" && (
        <div className="bg-background border-[1px] border-t-0 border-foreground shadow-[4px_4px_0_0_rgb(0,0,0)] p-3 relative z-30 flex flex-col gap-3">
           {(isPending || isRejected || isFlagged) && (
             <div
               className={
                 (isFlagged || isRejected) && !isPending
                   ? "flex justify-start items-center bg-red-50 dark:bg-red-950/40 p-2 border-2 border-red-700"
                   : "flex justify-start items-center bg-muted/30 p-2 border border-border"
               }
             >
               {isPending && <p className="font-mono text-[8px] text-amber-600 font-bold uppercase tracking-widest">Awaiting admin review — editing is disabled</p>}
               {isFlagged && (
                 <p className="font-mono text-[8px] text-red-800 dark:text-red-100 flex items-center font-bold uppercase tracking-widest">
                   <AlertTriangle className="w-3 h-3 mr-1 shrink-0 text-red-700 dark:text-red-300"/>
                   Flagged by moderation — editing is disabled until an admin updates the listing
                 </p>
               )}
               {isRejected && (
                 <div className="space-y-1">
                   <p className="font-mono text-[8px] text-red-800 dark:text-red-100 flex items-center font-bold uppercase tracking-widest">
                     <AlertTriangle className="w-3 h-3 mr-1 shrink-0 text-red-700 dark:text-red-300"/>
                     Rejected{ticket.rejectionReason ? `: ${ticket.rejectionReason}` : ''}
                   </p>
                   <p className="font-mono text-[8px] text-muted-foreground font-bold uppercase tracking-widest leading-relaxed">
                     Only an admin can return this listing to Available.
                   </p>
                 </div>
               )}
             </div>
           )}

           {!moderationLocked ? (
           <div className="flex flex-wrap gap-2">
             {showSellerEdit ? (
               <Button variant="outline" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit?.(ticket.id); }} className="h-7 px-2 font-mono text-[8px] uppercase tracking-widest rounded-none border-foreground hover:bg-foreground hover:text-background flex-1 shadow-[2px_2px_0_0_rgba(0,0,0,1)]"><Edit2 className="w-3 h-3 mr-1"/> Edit</Button>
             ) : null}

             {showSellerMarkSold ? (
               <Button variant="outline" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMarkSold?.(ticket.id); }} className="h-7 px-2 font-mono text-[8px] uppercase tracking-widest rounded-none border-foreground hover:bg-emerald-500 hover:text-white hover:border-emerald-500 flex-1 shadow-[2px_2px_0_0_rgba(0,0,0,1)]"><CheckCircle2 className="w-3 h-3 mr-1"/> Mark Sold</Button>
             ) : null}

             {showSellerDelete ? (
               <Button variant="outline" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete?.(ticket.id); }} className="h-7 px-2 font-mono text-[8px] uppercase tracking-widest rounded-none border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground focus:ring-destructive flex-shrink-0 shadow-[2px_2px_0_0_rgba(0,0,0,1)]"><Trash2 className="w-3 h-3"/></Button>
             ) : null}
           </div>
           ) : null}
        </div>
      )}

      {showTicketDetailLink && (
        <Link to={`/ticket/${ticket.id}${mode === 'seller' || fromDashboard ? '?from=dashboard' : ''}`} className="absolute inset-0 z-20 focus:outline-none focus:ring-2 ring-primary ring-offset-2">
          <span className="sr-only">View Ticket Details</span>
        </Link>
      )}
    </div>
  );
};
