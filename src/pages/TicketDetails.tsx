import { useState, useMemo } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, Calendar, ShieldCheck, AlertCircle, ArrowLeft, Ticket, Flag, Train, Bus, Copy, Share2, Facebook, MessageCircle, Send } from "lucide-react";
import { BrutalistLoadingPlaceholder } from "@/src/components/common/AuthLoadingPlaceholder";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ANONYMOUS_REPORTER_ID, createTicketReport } from "@/src/lib/firebase/ticketReports";
import NotFound from "./NotFound";
import { useAuth } from "@/src/contexts/AuthContext";
import { needsEmailVerification } from "@/src/lib/firebase/authVerification";
import { enqueueSellerPurchaseRequestNotification } from "@/src/lib/firebase/sellerTicketNotifications";
import { useTicketDetailListing } from "@/src/hooks/useTicketDetailListing";
import { openTicketPurchaseWhatsApp } from "@/src/lib/ticketBuyRequest";
import { isTicketDetailHiddenFromPublicBuyer } from "@/src/lib/ticketDetailVisibility";
import {
  ANONYMOUS_BUYER_ID,
  buyerPurchaseRequestLabelForWhatsAppIntent,
  recordBuyerPurchaseRequest,
} from "@/src/lib/firebase/purchaseRequests";
import { formatDepartureTimeDisplay } from "@/src/lib/formatDepartureTime";
import { COPY_TO_CLIPBOARD_FEEDBACK, copyTextWithToast } from "@/src/lib/copyTextWithToast";
import { ticketDisplayStatus } from "@/src/lib/ticketExpiration";
import { resolveTicketDetailBackNav } from "@/src/lib/ticketDetailAdminReturn";

const TicketDetails = () => {
  const { firebaseUser, currentUser, loading: authLoading } = useAuth();
  const { id } = useParams();
  const { ticket, isLoading, viewerUid } = useTicketDetailListing(id);
  const location = useLocation();
  const ticketBackNav = useMemo(
    () => resolveTicketDetailBackNav(location.search, location.state),
    [location.search, location.state],
  );

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [showShare, setShowShare] = useState(false);

  if (isLoading) {
    return (
      <BrutalistLoadingPlaceholder
        layout="viewport"
        message="Loading ticket…"
        srLabel="Loading ticket details"
      />
    );
  }

  if (!ticket) {
    return <NotFound />;
  }

  const viewerIsAdmin = currentUser?.role === "admin";
  const detailHiddenFromBuyer = isTicketDetailHiddenFromPublicBuyer(ticket, viewerUid, viewerIsAdmin);
  const derivedStatus = ticketDisplayStatus(ticket);
  const isDerivedExpired = derivedStatus === "expired";
  const isDerivedSold = derivedStatus === "sold";

  if (detailHiddenFromBuyer && authLoading) {
    return (
      <BrutalistLoadingPlaceholder layout="viewport" message="Loading…" srLabel="Checking access" />
    );
  }

  if (detailHiddenFromBuyer) {
    return <NotFound />;
  }

  const handleReportSubmit = async () => {
    if (!ticket) return;
    if (!reportReason.trim()) {
      toast.error("Please enter a reason for reporting.");
      return;
    }
    const sellerName = (ticket.sellerName ?? "").trim();
    if (!sellerName) {
      toast.error("Listing is missing seller details; report cannot be submitted.");
      return;
    }
    setReportSubmitting(true);
    try {
      await createTicketReport({
        ticketId: ticket.id,
        ticketName: ticket.transportName,
        sellerId: ticket.sellerId,
        sellerName,
        sellerPhone: (ticket.sellerPhone ?? "").trim(),
        reason: reportReason.trim(),
        reporterId: viewerUid ?? ANONYMOUS_REPORTER_ID,
      });
      toast.success("Report submitted. An administrator will review it.");
      setReportReason("");
      setIsReportModalOpen(false);
    } catch {
      toast.error("Could not submit report. Try again or contact support.");
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleRequestBuy = () => {
    if (!openTicketPurchaseWhatsApp(ticket)) {
      toast.error("WhatsApp purchase requests are not configured. Please use the Contact page.");
      return;
    }

    if (ticket.id) {
      const currentRequests = JSON.parse(localStorage.getItem("requestedTickets") || "[]");
      if (!currentRequests.includes(ticket.id)) {
        localStorage.setItem("requestedTickets", JSON.stringify([...currentRequests, ticket.id]));
      }
    }

    const actorUid = viewerUid ?? firebaseUser?.uid;
    if (actorUid === ticket.sellerId) {
      return;
    }

    const { buyerUserId, buyerLabel } = buyerPurchaseRequestLabelForWhatsAppIntent({
      firebaseUid: actorUid,
      firebaseEmail: firebaseUser?.email,
      firebaseDisplayName: firebaseUser?.displayName,
    });
    void recordBuyerPurchaseRequest({ ticket, buyerUserId, buyerLabel }).then(({ shouldNotifySeller }) => {
      if (!shouldNotifySeller) return;
      if (
        !firebaseUser ||
        needsEmailVerification(firebaseUser) ||
        !viewerUid ||
        viewerUid === ticket.sellerId ||
        buyerUserId === ANONYMOUS_BUYER_ID
      ) {
        return;
      }
      enqueueSellerPurchaseRequestNotification({
        sellerUserId: ticket.sellerId,
        ticketId: ticket.id,
        transportName: ticket.transportName,
        buyerUserId,
        buyerLabel,
      });
    });
  };

  const shareUrl = `${window.location.origin}/ticket/${ticket.id}`;
  const shareTitle = `Buy ${ticket.transportName} Ticket on RailSwap!`;

  const handleCopyId = () => {
    void copyTextWithToast(ticket.id, COPY_TO_CLIPBOARD_FEEDBACK.ticketId);
  };

  const handleShare = (platform: string) => {
    let url = "";
    switch (platform) {
      case "facebook":
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case "messenger":
        url = `fb-messenger://share/?link=${encodeURIComponent(shareUrl)}`;
        break;
      case "whatsapp":
        url = `https://wa.me/?text=${encodeURIComponent(`${shareTitle} ${shareUrl}`)}`;
        break;
      case "telegram":
        url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`;
        break;
      case "copy":
        void copyTextWithToast(shareUrl, COPY_TO_CLIPBOARD_FEEDBACK.shareLink);
        return;
    }
    if (url) window.open(url, "_blank");
  };

  return (
    <div className="flex-1 bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] min-h-screen pt-20 pb-16 sm:pt-24 sm:pb-24">
      <div className="page-shell">
        
        <Button variant="ghost" render={<Link to={ticketBackNav.href} />} className="mb-4 h-12 rounded-none border-2 border-foreground bg-background shadow-[4px_4px_0_0_rgba(0,0,0,1)] font-mono text-xs uppercase tracking-widest font-bold hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all sm:mb-8">
             <ArrowLeft className="w-4 h-4 mr-2" /> {ticketBackNav.label}
        </Button>

        <div className="grid grid-cols-1 gap-4 sm:gap-8 lg:grid-cols-3">
           
           {/* Main Ticket Area */}
           <div className="space-y-4 sm:space-y-8 lg:col-span-2">
              
              <div className="bg-background rounded-none border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] relative">
                 <div className="h-10 w-full bg-primary border-b-4 border-foreground flex space-x-2 px-6 items-center">
                   {Array.from({length: 15}).map((_, i) => (
                      <div key={i} className="w-4 h-4 bg-background border-2 border-foreground rounded-full" />
                   ))}
                 </div>
                 
                 <div className="p-4 pt-6 sm:p-8 sm:pt-10">
                    <div className="mb-6 sm:mb-10">
                      <div className="mb-3 flex items-center justify-between gap-2 sm:mb-4 sm:gap-3">
                        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                           <Badge className="bg-foreground text-background border-2 border-foreground font-mono font-bold uppercase tracking-widest rounded-none shadow-[2px_2px_0_0_rgba(0,0,0,1)] px-3 py-1 text-[10px] flex items-center">
                             {ticket.mode === 'train' ? <Train className="w-4 h-4 mr-1.5" /> : <Bus className="w-4 h-4 mr-1.5" />}
                             {ticket.mode === 'train'
                               ? (ticket.transportType.toLowerCase().includes('train') ? ticket.transportType : `${ticket.transportType} Train`)
                               : 'Bus'}
                           </Badge>
                           {isDerivedExpired ? (
                             <Badge className="bg-red-900 text-red-100 border-2 border-red-900 font-mono font-bold uppercase tracking-widest rounded-none shadow-[2px_2px_0_0_rgba(0,0,0,1)] px-3 py-1 text-[10px]">
                               Expired
                             </Badge>
                           ) : isDerivedSold ? (
                             <Badge className="bg-muted text-muted-foreground border-2 border-muted-foreground font-mono font-bold uppercase tracking-widest rounded-none px-3 py-1 text-[10px]">
                               Sold
                             </Badge>
                           ) : (
                             <Badge className="bg-emerald-400 text-emerald-950 border-2 border-emerald-950 font-mono font-bold uppercase tracking-widest rounded-none shadow-[2px_2px_0_0_rgba(4,120,87,1)] px-3 py-1 text-[10px]">
                               Available
                             </Badge>
                           )}
                        </div>
                        <div className="relative shrink-0 sm:ml-2">
                            <Button onClick={() => setShowShare(!showShare)} variant="outline" size="sm" className="h-7 px-3 rounded-none border-2 border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_rgba(0,0,0,1)] hover:bg-muted font-mono text-[10px] uppercase font-bold tracking-widest transition-all">
                                <Share2 className="w-3 h-3 mr-2" /> Share
                            </Button>
                            {showShare && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowShare(false)} />
                                <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-none border-4 border-foreground bg-background font-mono text-[10px] font-bold uppercase tracking-widest shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
                                  <button onClick={() => { handleShare('copy'); setShowShare(false); }} className="w-full flex items-center hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground px-4 py-3 border-b-2 border-foreground text-left transition-colors">
                                    <Copy className="w-3 h-3 mr-3" /> Copy Link
                                  </button>
                                  <button onClick={() => { handleShare('facebook'); setShowShare(false); }} className="w-full flex items-center hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground px-4 py-3 border-b-2 border-foreground text-left transition-colors">
                                    <Facebook className="w-3 h-3 mr-3" /> Facebook
                                  </button>
                                  <button onClick={() => { handleShare('messenger'); setShowShare(false); }} className="w-full flex items-center hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground px-4 py-3 border-b-2 border-foreground text-left transition-colors">
                                    <MessageCircle className="w-3 h-3 mr-3" /> Messenger
                                  </button>
                                  <button onClick={() => { handleShare('whatsapp'); setShowShare(false); }} className="w-full flex items-center hover:bg-emerald-500 hover:text-white focus:bg-emerald-500 focus:text-white px-4 py-3 border-b-2 border-foreground text-left transition-colors">
                                    <MessageCircle className="w-3 h-3 mr-3" /> WhatsApp
                                  </button>
                                  <button onClick={() => { handleShare('telegram'); setShowShare(false); }} className="w-full flex items-center hover:bg-blue-500 hover:text-white focus:bg-blue-500 focus:text-white px-4 py-3 text-left transition-colors">
                                    <Send className="w-3 h-3 mr-3" /> Telegram
                                  </button>
                                </div>
                              </>
                            )}
                        </div>
                      </div>
                        <h1 className="mb-2 inline-block border-2 border-foreground bg-primary px-2 font-heading text-4xl font-black uppercase tracking-tighter text-primary-foreground md:text-5xl sm:mb-3">
                          {ticket.transportName}
                        </h1>
                        <div className="mt-1 flex min-w-0 items-center gap-2 sm:mt-2 sm:gap-4">
                          <span
                            className="pointer-events-none shrink-0 select-none font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground sm:tracking-widest"
                            aria-hidden
                          >
                            Ticket ID:
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyId}
                            className="group min-w-0 flex-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-none border-0 bg-transparent p-0 text-left font-mono text-xs font-bold uppercase tracking-wide text-foreground outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:tracking-widest"
                            title="Copy ticket ID"
                            aria-label={`Copy ticket ID ${ticket.id}`}
                          >
                            <span className="inline-block whitespace-nowrap">{ticket.id}</span>
                          </button>
                        </div>
                    </div>

                    <div className="relative mb-6 flex flex-col items-center justify-between gap-4 border-2 border-foreground bg-muted px-3 py-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)] sm:mb-12 sm:gap-8 sm:px-4 sm:py-8 md:flex-row md:gap-0">
                       <div className="hidden md:block absolute top-1/2 left-[20%] right-[20%] h-1 bg-foreground -translate-y-1/2" />
                       
                       <div className="z-10 min-w-[200px] border-2 border-foreground bg-background p-3 text-center shadow-[4px_4px_0_0_rgba(0,0,0,1)] sm:p-4">
                         <p className="text-4xl font-heading font-black tracking-tighter">{formatDepartureTimeDisplay(ticket.departureTime)}</p>
                         <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground mt-2">
                           Departs
                         </p>
                       </div>
                       <div className="text-center z-10 bg-primary border-2 border-foreground p-3 rounded-none shadow-[2px_2px_0_0_rgba(0,0,0,1)] text-primary-foreground transform rotate-12">
                           <Clock className="w-6 h-6" />
                       </div>
                       <div className="z-10 min-w-0 border-2 border-foreground bg-background p-4 text-center shadow-[4px_4px_0_0_rgba(0,0,0,1)] sm:min-w-[240px] sm:p-6">
                         <p className="text-lg font-heading font-black tracking-tighter uppercase truncate">{ticket.from}</p>
                         <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground my-2 border-y border-foreground/20 py-1">
                           TO
                         </p>
                         <p className="text-lg font-heading font-black tracking-tighter uppercase truncate">{ticket.to}</p>
                       </div>
                    </div>

                    {(ticket.additionalNotes ?? "").trim().length > 0 && (
                      <div className="mb-6 border-2 border-foreground bg-muted p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)] sm:mb-10 sm:p-5">
                        <p className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">
                          Seller notes
                        </p>
                        <p className="font-mono text-sm font-medium whitespace-pre-wrap leading-relaxed text-foreground">
                          {(ticket.additionalNotes ?? "").trim()}
                        </p>
                      </div>
                    )}

                    <div className="mb-6 grid grid-cols-1 gap-3 sm:mb-10 sm:grid-cols-3 sm:gap-4">
                      <div className="bg-background border-2 border-foreground p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Date
                        </span>
                        <span className="font-mono font-black text-sm uppercase">{format(new Date(ticket.date), "dd MMM yy")}</span>
                      </div>
                      <div className="bg-background border-2 border-foreground p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2 flex items-center gap-1">
                          <Ticket className="w-3 h-3" /> Class
                        </span>
                        <span className="font-mono font-black text-sm uppercase">{ticket.seatClass}</span>
                      </div>
                      <div className="bg-background border-2 border-foreground p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2 block">
                          Seat/Passenger Count
                        </span>
                        <span className="font-mono font-black text-sm uppercase">{ticket.passengerCount} Adult</span>
                      </div>
                    </div>
                 </div>
              </div>

           </div>

              {/* Sidebar: Price */}
              <div className="space-y-4 sm:space-y-8">
                 
                 {/* Purchase Card */}
                 <div className="sticky top-20 rounded-none border-4 border-foreground bg-background px-4 pb-6 pt-5 shadow-[16px_16px_0_0_rgba(0,0,0,1)] sm:top-24 sm:px-8 sm:pb-10 sm:pt-8">
                    
                    <div className="mb-4 space-y-3 sm:mb-6 sm:space-y-4">
                       <div className="flex justify-between font-mono text-sm uppercase font-bold text-muted-foreground">
                          <span>Selling Price</span>
                          <span className="text-foreground">৳{ticket.sellingPrice}</span>
                       </div>
                       <div className="flex justify-between font-mono text-sm uppercase font-bold text-muted-foreground">
                          <span>Platform Fee</span>
                          <span className="text-foreground">৳20.00</span>
                       </div>
                    </div>

                    <Separator className="mb-4 border-b-2 border-foreground sm:mb-6" />

                    <div className="mb-5 sm:mb-8">
                       <p className="mb-3 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground sm:mb-4">Total Price</p>
                       <div className="flex flex-col gap-2">
                         <span className="text-5xl font-heading font-black tracking-tighter text-foreground bg-primary px-3 py-3 border-2 border-foreground inline-block w-max shadow-[4px_4px_0_0_rgba(0,0,0,1)]">৳{(Number(ticket.sellingPrice) + 20).toFixed(2)}</span>
                       </div>
                    </div>
  
                    {isDerivedExpired || isDerivedSold ? (
                       <div className={`w-full h-16 flex items-center justify-center rounded-none text-sm font-mono uppercase tracking-widest font-black border-2 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)] ${isDerivedExpired ? "bg-red-900 text-red-100" : "bg-muted text-muted-foreground"}`}>
                          {isDerivedExpired ? "Trip departed — listing expired" : "Sold"}
                       </div>
                    ) : (
                       <Button
                          onClick={handleRequestBuy}
                          className={`w-full h-16 rounded-none text-sm font-mono uppercase tracking-widest font-black transition-all border-2 bg-foreground text-background border-transparent hover:bg-primary hover:text-primary-foreground hover:border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)]`}
                       >
                          Request to Buy
                       </Button>
                    )}
  
                    <div className="mt-5 flex items-center justify-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground sm:mt-8">
                       <ShieldCheck className="w-4 h-4 text-emerald-600" /> Payment Secured Until Delivery
                    </div>
                    
                    <Separator className="my-4 border-b-2 border-dashed border-foreground/20 sm:my-6" />
                    
                    <div className="flex justify-center">
                       <Button variant="ghost" onClick={() => setIsReportModalOpen(true)} className="text-muted-foreground hover:text-destructive font-mono text-[10px] uppercase tracking-widest font-bold">
                          <Flag className="w-3 h-3 mr-2" /> Report this listing
                       </Button>
                    </div>
                 </div>
  
              </div>
  
           </div>

           <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
             <DialogContent className="rounded-none border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] bg-background">
               <DialogHeader>
                 <DialogTitle className="font-heading font-black text-2xl uppercase tracking-tighter text-destructive flex items-center gap-2">
                   <AlertCircle className="w-6 h-6" /> Report Ticket
                 </DialogTitle>
                 <DialogDescription className="font-mono text-xs font-bold uppercase tracking-widest mt-2">
                   Help us keep the marketplace safe. You can submit without signing in.
                 </DialogDescription>
               </DialogHeader>
               
               <div className="space-y-3 py-3 sm:space-y-4 sm:py-4">
                 <div className="border-2 border-foreground bg-muted p-3 shadow-inner sm:p-4">
                   <p className="font-mono text-[10px] uppercase font-bold text-muted-foreground mb-1">Target Ticket</p>
                   <p className="font-heading font-bold text-lg uppercase">{ticket.transportName} <span className="font-mono text-xs text-muted-foreground ml-2">({ticket.id})</span></p>
                 </div>
                 <div className="space-y-2">
                   <Textarea 
                     value={reportReason}
                     onChange={(e) => setReportReason(e.target.value)}
                     placeholder="Why are you reporting this ticket? (e.g. Scammer, duplicate, invalid information)"
                     className="min-h-[120px] rounded-none border-2 border-foreground font-mono text-xs focus-visible:ring-0 shadow-[4px_4px_0_0_rgba(0,0,0,1)] resize-none p-4"
                   />
                 </div>
               </div>

               <DialogFooter className="flex gap-2 sm:justify-end">
                 <Button variant="outline" onClick={() => setIsReportModalOpen(false)} className="rounded-none font-mono text-[10px] uppercase tracking-widest font-bold border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all">
                   Cancel
                 </Button>
                 <Button disabled={reportSubmitting} onClick={() => void handleReportSubmit()} className="rounded-none font-mono text-[10px] uppercase tracking-widest font-bold border-2 border-destructive bg-destructive text-destructive-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all hover:bg-destructive/90">
                   {reportSubmitting ? "Submitting…" : "Submit Report"}
                 </Button>
               </DialogFooter>
             </DialogContent>
           </Dialog>

      </div>
    </div>
  );
};

export default TicketDetails;
