import { useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, Calendar, ShieldCheck, AlertCircle, ArrowLeft, Ticket, Flag, Train, Bus, Copy, Share2, Facebook, MessageCircle, Send, Loader2 } from "lucide-react";
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

const TicketDetails = () => {
  const { firebaseUser } = useAuth();
  const { id } = useParams();
  const { ticket, isLoading, viewerUid } = useTicketDetailListing(id);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const fromDashboard = searchParams.get('from') === 'dashboard';

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [showShare, setShowShare] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center gap-3 text-muted-foreground px-4">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        <p className="font-mono font-bold uppercase tracking-widest text-[10px] text-center">Loading ticket…</p>
        <span className="sr-only">Loading ticket details</span>
      </div>
    );
  }

  if (!ticket) {
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

    if (
      firebaseUser &&
      !needsEmailVerification(firebaseUser) &&
      viewerUid &&
      viewerUid !== ticket.sellerId
    ) {
      enqueueSellerPurchaseRequestNotification({
        sellerUserId: ticket.sellerId,
        ticketId: ticket.id,
        transportName: ticket.transportName,
        buyerUserId: viewerUid,
        buyerLabel: firebaseUser.email ?? firebaseUser.displayName ?? viewerUid,
      });
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(ticket.id);
    toast.success("Ticket ID copied to clipboard!");
  };

  const shareUrl = window.location.origin + `/ticket/${ticket.id}`;
  const shareTitle = `Buy ${ticket.transportName} Ticket on RailSwap!`;

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
        url = `https://wa.me/?text=${encodeURIComponent(shareTitle + " " + shareUrl)}`;
        break;
      case "telegram":
        url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`;
        break;
      case "copy":
        navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard!");
        return;
    }
    if (url) window.open(url, "_blank");
  };

  return (
    <div className="flex-1 bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] min-h-screen pt-24 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <Button variant="ghost" render={<Link to={fromDashboard ? "/dashboard" : "/browse"} />} className="mb-8 h-12 rounded-none border-2 border-foreground bg-background shadow-[4px_4px_0_0_rgba(0,0,0,1)] font-mono text-xs uppercase tracking-widest font-bold hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all">
             <ArrowLeft className="w-4 h-4 mr-2" /> {fromDashboard ? "Back to Dashboard" : "Back to listings"}
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           
           {/* Main Ticket Area */}
           <div className="lg:col-span-2 space-y-8">
              
              <div className="bg-background rounded-none border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] relative">
                 <div className="h-10 w-full bg-primary border-b-4 border-foreground flex space-x-2 px-6 items-center">
                   {Array.from({length: 15}).map((_, i) => (
                      <div key={i} className="w-4 h-4 bg-background border-2 border-foreground rounded-full" />
                   ))}
                 </div>
                 
                 <div className="p-8 pt-10">
                    <div className="flex justify-between items-start mb-10">
                      <div>
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                           <Badge className="bg-foreground text-background border-2 border-foreground font-mono font-bold uppercase tracking-widest rounded-none shadow-[2px_2px_0_0_rgba(0,0,0,1)] px-3 py-1 text-[10px] flex items-center">
                             {ticket.mode === 'train' ? <Train className="w-4 h-4 mr-1.5" /> : <Bus className="w-4 h-4 mr-1.5" />}
                             {ticket.mode === 'train' ? (ticket.transportType.toLowerCase().includes('train') ? ticket.transportType : `${ticket.transportType} Train`) : (ticket.transportType.toLowerCase().includes('bus') ? ticket.transportType : `${ticket.transportType} Bus`)}
                           </Badge>
                           <Badge className="bg-emerald-400 text-emerald-950 border-2 border-emerald-950 font-mono font-bold uppercase tracking-widest rounded-none shadow-[2px_2px_0_0_rgba(4,120,87,1)] px-3 py-1 text-[10px]">
                             Available
                           </Badge>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-heading font-black tracking-tighter uppercase mb-3 bg-primary inline-block px-2 text-primary-foreground border-2 border-foreground">{ticket.transportName}</h1>
                        <div className="flex items-center gap-4 mt-2">
                          <button onClick={handleCopyId} className="flex items-center gap-2 group hover:opacity-80 transition-opacity" title="Copy Ticket ID">
                            <span className="text-foreground font-mono font-bold uppercase tracking-widest text-xs cursor-pointer">ID: {ticket.id}</span>
                          </button>
                          
                          <div className="relative">
                            <Button onClick={() => setShowShare(!showShare)} variant="outline" size="sm" className="h-7 px-3 rounded-none border-2 border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_rgba(0,0,0,1)] hover:bg-muted font-mono text-[10px] uppercase font-bold tracking-widest transition-all">
                                <Share2 className="w-3 h-3 mr-2" /> Share
                            </Button>
                            {showShare && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowShare(false)} />
                                <div className="absolute left-0 top-full mt-2 z-50 w-48 rounded-none border-4 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)] bg-background font-mono uppercase tracking-widest font-bold text-[10px]">
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
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between mb-12 relative px-4 py-8 bg-muted border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] gap-8 md:gap-0">
                       <div className="hidden md:block absolute top-1/2 left-[20%] right-[20%] h-1 bg-foreground -translate-y-1/2" />
                       
                       <div className="text-center z-10 bg-background border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-4 min-w-[200px]">
                         <p className="text-4xl font-heading font-black tracking-tighter">{ticket.departureTime}</p>
                         <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground mt-2">
                           Departs
                         </p>
                       </div>
                       <div className="text-center z-10 bg-primary border-2 border-foreground p-3 rounded-none shadow-[2px_2px_0_0_rgba(0,0,0,1)] text-primary-foreground transform rotate-12">
                           <Clock className="w-6 h-6" />
                       </div>
                       <div className="text-center z-10 bg-background border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-6 min-w-[240px]">
                         <p className="text-lg font-heading font-black tracking-tighter uppercase truncate">{ticket.from}</p>
                         <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground my-2 border-y border-foreground/20 py-1">
                           TO
                         </p>
                         <p className="text-lg font-heading font-black tracking-tighter uppercase truncate">{ticket.to}</p>
                       </div>
                    </div>

                    {(ticket.additionalNotes ?? "").trim().length > 0 && (
                      <div className="mb-10 bg-muted border-2 border-foreground p-5 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                        <p className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">
                          Seller notes
                        </p>
                        <p className="font-mono text-sm font-medium whitespace-pre-wrap leading-relaxed text-foreground">
                          {(ticket.additionalNotes ?? "").trim()}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
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
                          Seat
                        </span>
                        <span className="font-mono font-black text-sm uppercase">{ticket.seatNumber}</span>
                      </div>
                      <div className="bg-background border-2 border-foreground p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2 block">
                          Passengers
                        </span>
                        <span className="font-mono font-black text-sm uppercase">{ticket.passengerCount} Adult</span>
                      </div>
                    </div>

                    <div className="bg-destructive text-destructive-foreground border-4 border-foreground p-5 flex gap-4 shadow-[8px_8px_0_0_rgba(0,0,0,1)] transform -rotate-1">
                      <AlertCircle className="w-8 h-8 shrink-0 mt-1" />
                      <div>
                        <h4 className="font-heading font-black text-xl uppercase mb-1 tracking-tighter">Important Notice</h4>
                        <p className="font-mono text-xs font-bold uppercase tracking-wide leading-relaxed">Please ensure you carry a valid photo ID matching the passenger age/gender category during the journey. Name changes are subject to railway guidelines.</p>
                      </div>
                    </div>
                 </div>
              </div>

           </div>

              {/* Sidebar: Price */}
              <div className="space-y-8">
                 
                 {/* Purchase Card */}
                 <div className="bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] px-8 pt-8 pb-10 sticky top-24 rounded-none">
                    
                    <div className="space-y-4 mb-6">
                       <div className="flex justify-between font-mono text-sm uppercase font-bold text-muted-foreground">
                          <span>Selling Price</span>
                          <span className="text-foreground">৳{ticket.sellingPrice}</span>
                       </div>
                       <div className="flex justify-between font-mono text-sm uppercase font-bold text-muted-foreground">
                          <span>Platform Fee</span>
                          <span className="text-foreground">৳20.00</span>
                       </div>
                    </div>

                    <Separator className="mb-6 border-b-2 border-foreground" />

                    <div className="mb-8">
                       <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Total Price</p>
                       <div className="flex flex-col gap-2">
                         <span className="text-5xl font-heading font-black tracking-tighter text-foreground bg-primary px-3 py-3 border-2 border-foreground inline-block w-max shadow-[4px_4px_0_0_rgba(0,0,0,1)]">৳{(Number(ticket.sellingPrice) + 20).toFixed(2)}</span>
                       </div>
                    </div>
  
                    <Button 
                       onClick={handleRequestBuy} 
                       className={`w-full h-16 rounded-none text-sm font-mono uppercase tracking-widest font-black transition-all border-2 bg-foreground text-background border-transparent hover:bg-primary hover:text-primary-foreground hover:border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)]`}
                    >
                       Request to Buy
                    </Button>
  
                    <div className="mt-8 flex items-center justify-center gap-2 font-mono text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                       <ShieldCheck className="w-4 h-4 text-emerald-600" /> Payment Secured Until Delivery
                    </div>
                    
                    <Separator className="my-6 border-b-2 border-foreground/20 border-dashed" />
                    
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
               
               <div className="space-y-4 py-4">
                 <div className="bg-muted p-4 border-2 border-foreground shadow-inner">
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
