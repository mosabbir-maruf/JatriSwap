import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BuyerPurchaseRequestCard } from "@/src/components/common/BuyerPurchaseRequestCard";
import { TicketCard } from "@/src/components/common/TicketCard";
import {
  Ticket,
  Activity,
  Bell,
  LogOut,
  User as UserIcon,
  FileText,
  ArrowRight,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "@/src/contexts/AuthContext";
import { needsEmailVerification } from "@/src/lib/firebase/authVerification";
import { Ticket as TicketType, Notification as NotificationType, BuyerPurchaseRequest } from "@/src/types";
import { subscribeToSellerTickets, deleteTicket, updateTicketStatus } from "@/src/lib/firebase/tickets";
import { scheduleTicketDeleteWithUndo } from "@/src/lib/ticketDeleteUndo";
import {
  canSellerDeleteListing,
  canSellerEditListingFields,
  canSellerMarkSold,
} from "@/src/lib/sellerListingControls";
import { markNotificationReadIfUnread } from "@/src/lib/firebase/notifications";
import { signOut } from "firebase/auth";
import { auth } from "@/src/lib/firebase/firebase";
import Unauthorized from "./Unauthorized";
import { toast } from "sonner";

import { EditTicketDialog } from "@/src/components/common/EditTicketDialog";
import { EditProfileDialog } from "@/src/components/common/EditProfileDialog";
import {
  readSellDraft,
  sellDraftHasMeaningfulContent,
  summarizeSellDraft,
  SELL_DRAFT_STORAGE_KEY,
} from "@/src/lib/sellDraft";
import { subscribeToSellerPurchaseRequests } from "@/src/lib/firebase/purchaseRequests";
import { isSellerPurchaseRequestNotification } from "@/src/lib/firebase/sellerTicketNotifications";
import { formatPurchaseLeadTapSummaryLine } from "@/src/lib/formatPurchaseRequest";
import {
  alertsSortedForAccountStatus,
  unreadNotificationsCount,
} from "@/src/lib/moderationNotifications";
import { DashboardAlertRow } from "@/src/components/common/DashboardAlertRow";
import { MarkAllNotificationsReadButton } from "@/src/components/common/MarkAllNotificationsReadButton";
import { AuthLoadingPlaceholder } from "@/src/components/common/AuthLoadingPlaceholder";
import { useSellerNotificationsSubscription } from "@/src/hooks/useSellerNotificationsSubscription";

/** Sidebar shows newest subset; full history on `/alerts`. */
const ALERTS_SIDEBAR_PREVIEW_LIMIT = 4;

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentUser, firebaseUser, loading: authLoading } = useAuth();
  const [tickets, setTickets] = useState<TicketType[]>([]);
  /** First Firestore snapshot not received yet for this user session. */
  const [sellerTicketsReady, setSellerTicketsReady] = useState(false);
  const [inboundPurchaseRequests, setInboundPurchaseRequests] = useState<BuyerPurchaseRequest[]>([]);
  const [inboundPurchaseRequestsReady, setInboundPurchaseRequestsReady] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const [profileDialogOpen, setProfileDialogOpen] = useState(() => searchParams.get("action") === "profile");
  /** Bump when localStorage draft may have changed (other tab or revisiting drafts tab). */
  const [sellDraftRevision, setSellDraftRevision] = useState(0);

  useEffect(() => {
    if (searchParams.get("action") === "profile") {
      setProfileDialogOpen(true);
      setSearchParams(new URLSearchParams(), { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const bump = () => setSellDraftRevision((r) => r + 1);
    const onStorage = (e: StorageEvent) => {
      if (e.key === SELL_DRAFT_STORAGE_KEY || e.key === null) bump();
    };
    window.addEventListener('storage', onStorage);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') bump();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const sellDraftSnapshot = useMemo(() => readSellDraft(), [sellDraftRevision]);
  const sellDraftSummary =
    sellDraftSnapshot && sellDraftHasMeaningfulContent(sellDraftSnapshot)
      ? summarizeSellDraft(sellDraftSnapshot)
      : null;

  const { notifications, notificationsReady } = useSellerNotificationsSubscription(
    authLoading,
    currentUser,
    firebaseUser?.uid,
  );

  const { purchaseLeadCount, purchaseTapTotal } = useMemo(() => {
    let taps = 0;
    for (const r of inboundPurchaseRequests) {
      taps += r.requestCount ?? 1;
    }
    return { purchaseLeadCount: inboundPurchaseRequests.length, purchaseTapTotal: taps };
  }, [inboundPurchaseRequests]);

  const unreadNotificationCount = useMemo(() => unreadNotificationsCount(notifications), [notifications]);

  const sortedNotifications = useMemo(
    () => alertsSortedForAccountStatus(notifications, currentUser?.status),
    [notifications, currentUser?.status],
  );
  const sidebarAlertPreview = useMemo(
    () => sortedNotifications.slice(0, ALERTS_SIDEBAR_PREVIEW_LIMIT),
    [sortedNotifications],
  );

  const handleNotificationClick = useCallback(async (notif: NotificationType) => {
    await markNotificationReadIfUnread(notif);
  }, []);

  const handleDelete = (id: string) => {
    const row = tickets.find((t) => t.id === id);
    if (!row || !canSellerDeleteListing(row.status)) {
      toast.error("This listing can’t be deleted while it’s under admin review.");
      return;
    }
    scheduleTicketDeleteWithUndo({
      ticketId: id,
      message: "Listing will be deleted. Undo within 10 seconds.",
      commitDelete: () => deleteTicket(id),
      onCommitted: () => toast.success("Listing deleted."),
      onCommitFailed: () => toast.error("Failed to delete listing."),
    });
  };

  const handleMarkSold = async (id: string) => {
    const row = tickets.find((t) => t.id === id);
    if (!row || !canSellerMarkSold(row.status)) {
      toast.error("Only active listings can be marked sold.");
      return;
    }
    try {
      await updateTicketStatus(id, "sold");
      toast.success("Ticket marked as sold.");
    } catch(e) {
      toast.error("Failed to update status.");
    }
  };

  const handleEdit = (id: string) => {
    const ticketToEdit = tickets.find((t) => t.id === id);
    if (!ticketToEdit || !canSellerEditListingFields(ticketToEdit.status)) {
      toast.error("You can’t edit this listing until an admin sets it back to Available.");
      return;
    }
    setEditingTicket(ticketToEdit);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      setSellerTicketsReady(false);
      setInboundPurchaseRequestsReady(false);
      setTickets([]);
      setInboundPurchaseRequests([]);
      return;
    }
    setSellerTicketsReady(false);
    setInboundPurchaseRequestsReady(false);
    const sellerUid = firebaseUser?.uid ?? currentUser.id;
    const unsubscribeTickets = subscribeToSellerTickets(sellerUid, (sellerTickets) => {
      setTickets(sellerTickets);
      setSellerTicketsReady(true);
    });
    const unsubscribePurchaseRequests = subscribeToSellerPurchaseRequests(sellerUid, (rows) => {
      setInboundPurchaseRequests(rows);
      setInboundPurchaseRequestsReady(true);
    });
    return () => {
      unsubscribeTickets();
      unsubscribePurchaseRequests();
    };
  }, [currentUser, firebaseUser?.uid, authLoading]);

  if (authLoading) {
    return <AuthLoadingPlaceholder />;
  }

  if (firebaseUser && needsEmailVerification(firebaseUser)) {
    return <Navigate to="/verify-email" replace />;
  }

  if (!currentUser) {
    return <Unauthorized />;
  }

  const profileUiLabel = currentUser.role === "admin" ? "Profile" : "Edit Profile";

  const sellerUid = firebaseUser?.uid ?? currentUser.id;
  const myListings = tickets.filter((t) => t.sellerId === sellerUid);

  const activeListingsCount = myListings.filter(t => t.status === "available").length;
  const ticketsSoldCount = myListings.filter(t => t.status === "sold").length;
  const totalViews = myListings.reduce((sum, t) => sum + (t.views || 0), 0);

  const DASHBOARD_STATS = {
    ...currentUser,
    views: totalViews,
    activeListings: activeListingsCount,
    ticketsSold: ticketsSoldCount,
    purchaseLeadCount,
    purchaseTapTotal,
  };

  const profileInitials =
    currentUser.name
      ?.split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <div className="flex-1 bg-background min-h-screen pt-32 pb-24 relative">
      <div className="page-shell relative z-10">
        
        {/* Profile Header */}
        <div className="bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-8 md:p-10 mb-16 flex flex-col md:flex-row items-center gap-8 relative">
           <div className="relative shrink-0">
              <Avatar className="w-28 h-28 border-4 border-foreground rounded-none shadow-[8px_8px_0_0_rgba(0,0,0,1)] bg-card">
                 <AvatarImage src={DASHBOARD_STATS.avatar} className="object-cover" />
                 <AvatarFallback className="bg-background text-2xl font-black font-heading rounded-none">{profileInitials}</AvatarFallback>
              </Avatar>
           </div>
           
           <div className="text-center md:text-left flex-1 min-w-0">
              <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                 <h1 className="font-heading text-4xl md:text-5xl font-black tracking-tighter uppercase text-foreground">{DASHBOARD_STATS.name}</h1>
              </div>
              <p className="font-mono text-muted-foreground uppercase tracking-widest text-[10px] font-bold mb-6 flex items-center justify-center md:justify-start flex-wrap gap-2">
                 <span>Joined Oct 2023</span>
              </p>
              
              <div className="flex items-center justify-center md:justify-start gap-8 flex-wrap">
                {!sellerTicketsReady ? (
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                    <Spinner size="sm" className="shrink-0" />
                    <span>Loading listing stats…</span>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col items-center md:items-start text-center md:text-left">
                      <span className="font-heading text-4xl font-black text-foreground">{DASHBOARD_STATS.activeListings}</span>
                      <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mt-1 font-bold">Active Listings</span>
                    </div>
                    <div className="w-px h-12 bg-border border-r-2 border-border hidden md:block" />
                    <div className="flex flex-col items-center md:items-start text-center md:text-left">
                      <span className="font-heading text-4xl font-black text-foreground">{DASHBOARD_STATS.ticketsSold}</span>
                      <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mt-1 font-bold">Sold</span>
                    </div>
                    <div className="w-px h-12 bg-border border-r-2 border-border hidden md:block" />
                    <div className="flex flex-col items-center md:items-start text-center md:text-left gap-1">
                      {!inboundPurchaseRequestsReady ? (
                        <Spinner size="lg" variant="muted" className="shrink-0" />
                      ) : (
                        <span className="font-heading text-4xl font-black text-emerald-700 dark:text-emerald-400">
                          {DASHBOARD_STATS.purchaseLeadCount}
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                        Purchase leads
                      </span>
                      {inboundPurchaseRequestsReady && DASHBOARD_STATS.purchaseTapTotal > 0 ? (
                        <span className="font-mono text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                          {DASHBOARD_STATS.purchaseTapTotal} WhatsApp tap
                          {DASHBOARD_STATS.purchaseTapTotal === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
           </div>

           <div className="flex flex-col w-full md:w-auto gap-4 shrink-0 mt-6 md:mt-0">
              <Button render={<Link to="/sell" className="flex items-center" />} className="rounded-none h-14 px-8 border-2 border-transparent font-mono text-xs font-bold uppercase tracking-widest shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all bg-foreground text-background">
                <Ticket className="w-4 h-4 mr-2" /> Sell a Ticket
              </Button>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setProfileDialogOpen(true)} className="flex-1 rounded-none h-12 border-2 border-foreground bg-background px-4 font-mono text-[10px] font-bold uppercase tracking-widest shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all">
                  <UserIcon className="w-4 h-4 mr-2" /> {profileUiLabel}
                </Button>
                <Button
                  onClick={() => void signOut(auth).then(() => navigate("/", { replace: true }))}
                  variant="outline"
                  className="flex-1 rounded-none h-12 border-2 border-foreground bg-muted text-foreground hover:bg-destructive hover:text-white px-4 font-mono text-[10px] font-bold uppercase tracking-widest shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </Button>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:items-start">
          
          {/* Sidebar: sticky below site header while main tabs scroll (profile above scrolls away). */}
          <div className="lg:col-span-1 lg:sticky lg:top-24 lg:z-10 lg:self-start space-y-8">
             {/* Stats */}
             <Card className="rounded-none border-2 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)] bg-background">
               <CardHeader className="pb-4 border-b-2 border-border">
                 <CardTitle className="font-mono text-[10px] uppercase tracking-widest text-foreground flex items-center gap-2 font-black"><Activity className="w-4 h-4 text-primary" /> Overview</CardTitle>
               </CardHeader>
               <CardContent className="pt-4 space-y-4">
                 {!sellerTicketsReady || !inboundPurchaseRequestsReady ? (
                   <div className="space-y-4" aria-busy="true">
                     {[1, 2, 3, 4, 5].map((i) => (
                       <div key={i} className="flex justify-between items-center border-b-2 border-dashed border-border pb-2 last:border-0">
                         <Skeleton className="h-4 w-28 rounded-none" />
                         <Skeleton className="h-4 w-10 rounded-none" />
                       </div>
                     ))}
                   </div>
                 ) : (
                   <>
                     <div className="flex justify-between items-center text-sm border-b-2 border-dashed border-border pb-2">
                       <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Total Views</span>
                       <span className="font-mono text-xs font-bold text-foreground">{DASHBOARD_STATS.views}</span>
                     </div>
                     <div className="flex justify-between items-center text-sm border-b-2 border-dashed border-border pb-2">
                       <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-bold text-amber-600">Active Listings</span>
                       <span className="font-mono text-xs font-bold text-amber-600">{DASHBOARD_STATS.activeListings}</span>
                     </div>
                     <div className="flex justify-between items-center text-sm border-b-2 border-dashed border-border pb-2">
                       <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Tickets Sold</span>
                       <span className="font-mono text-xs font-bold text-foreground">{DASHBOARD_STATS.ticketsSold}</span>
                     </div>
                     <div className="flex justify-between items-center text-sm border-b-2 border-dashed border-border pb-2">
                       <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                         Purchase leads
                       </span>
                       <span className="font-mono text-xs font-bold text-emerald-600">{DASHBOARD_STATS.purchaseLeadCount}</span>
                     </div>
                     <div className="flex justify-between items-center text-sm">
                       <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                         WhatsApp taps
                       </span>
                       <span className="font-mono text-xs font-bold text-foreground">{DASHBOARD_STATS.purchaseTapTotal}</span>
                     </div>
                   </>
                 )}
               </CardContent>
             </Card>

             {/* Notifications Mini */}
             <Card className="rounded-none border-2 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)] bg-background">
               <CardHeader className="pb-4 border-b-2 border-border">
                 <div className="flex justify-between items-center gap-2 flex-wrap">
                   <div className="flex items-center gap-2 min-w-0">
                     <CardTitle className="font-mono text-[10px] uppercase tracking-widest text-foreground flex items-center gap-2 font-black relative z-10"><Bell className="w-4 h-4" /> Alerts</CardTitle>
                     {notificationsReady && unreadNotificationCount > 0 ? (
                       <Badge variant="default" className="rounded-none px-2 min-w-[20px] justify-center text-[10px] font-mono font-bold bg-primary text-primary-foreground border border-primary shadow-[2px_2px_0_0_rgba(var(--primary-color),1)] shrink-0">
                         {unreadNotificationCount}
                       </Badge>
                     ) : null}
                   </div>
                   {notificationsReady && unreadNotificationCount > 0 ? (
                     <div className="shrink-0 ml-auto">
                       <MarkAllNotificationsReadButton
                         userId={sellerUid}
                         unreadCount={unreadNotificationCount}
                         compact
                       />
                     </div>
                   ) : null}
                 </div>
               </CardHeader>
               <CardContent className="flex flex-col gap-0 pt-4">
                 {/* Preview list (max 4) — no inner scroll; full list on `/alerts`. */}
                 <div className="space-y-4">
                    {!notificationsReady ? (
                      <div className="space-y-3" aria-busy="true">
                        <Skeleton className="h-12 w-full rounded-none border border-border" />
                        <Skeleton className="h-12 w-full rounded-none border border-border" />
                        <Skeleton className="h-12 w-full rounded-none border border-border" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest font-bold">No alerts yet.</p>
                    ) : (
                      sidebarAlertPreview.map((n) => (
                        <DashboardAlertRow key={n.id} notification={n} onInteract={handleNotificationClick} />
                      ))
                    )}
                 </div>
                 {notificationsReady ? (
                   <div className="mt-4 shrink-0 border-t-2 border-border pt-4 bg-background">
                     <Button
                       render={<Link to="/alerts" />}
                       variant="outline"
                       className="w-full rounded-none font-mono text-[10px] uppercase tracking-widest font-bold border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] gap-2"
                     >
                       View all alerts
                       <ArrowRight className="w-4 h-4" aria-hidden />
                     </Button>
                   </div>
                 ) : null}
               </CardContent>
             </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
             <Tabs
               defaultValue="listings"
               className="w-full"
               onValueChange={(v) => {
                 if (v === 'drafts') setSellDraftRevision((r) => r + 1);
               }}
             >
                <TabsList className="bg-background border-2 border-foreground rounded-none w-full flex p-0 h-14 shadow-[4px_4px_0_0_rgba(0,0,0,1)] mb-8 overflow-hidden">
                  <TabsTrigger value="listings" className="rounded-none flex-1 font-mono text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-foreground data-[state=active]:text-background h-full transition-colors border-r-2 border-transparent data-[state=active]:border-foreground">My Listings</TabsTrigger>
                  <TabsTrigger
                    value="requests"
                    className="rounded-none flex-1 font-mono text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-foreground data-[state=active]:text-background h-full transition-colors border-r-2 border-transparent data-[state=active]:border-foreground gap-1"
                  >
                    <span className="hidden sm:inline">Purchase requests</span>
                    <span className="sm:hidden">Leads</span>
                  </TabsTrigger>
                  <TabsTrigger value="drafts" className="rounded-none flex-1 font-mono text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-foreground data-[state=active]:text-background h-full transition-colors hidden md:flex">Drafts & History</TabsTrigger>
                </TabsList>

                <TabsContent value="listings" className="space-y-6 mt-0">
                   <div className="flex justify-between items-center border-b-2 border-foreground pb-4 mb-8">
                      <h3 className="font-heading text-2xl font-black uppercase tracking-tighter">My Ticket <span className="text-primary italic">Listings</span></h3>
                   </div>
                   
                   {!sellerTicketsReady ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8" aria-busy="true">
                       <Skeleton className="min-h-[380px] w-full rounded-none border-2 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)]" />
                       <Skeleton className="min-h-[380px] w-full rounded-none border-2 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)]" />
                     </div>
                   ) : (
                     <>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         {myListings.map((ticket) => (
                           <TicketCard
                             key={ticket.id}
                             ticket={ticket}
                             mode="seller"
                             fromDashboard={true}
                             onDelete={handleDelete}
                             onEdit={handleEdit}
                             onMarkSold={handleMarkSold}
                           />
                         ))}
                       </div>
                       {myListings.length === 0 && (
                         <div className="bg-background rounded-none p-8 md:p-16 text-center border-4 border-dashed border-border flex flex-col items-center">
                           <Ticket className="w-12 h-12 text-muted-foreground mb-6" strokeWidth={1} />
                           <h4 className="font-heading font-black uppercase text-2xl tracking-tighter mb-4 text-foreground">No Active Listings</h4>
                           <p className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-8">You don&apos;t have any tickets currently listed for sale.</p>
                           <Button render={<Link to="/sell" />} className="rounded-none px-8 h-12 font-mono text-[10px] border-2 border-foreground bg-primary text-primary-foreground uppercase tracking-widest font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all">
                             Sell a Ticket
                           </Button>
                         </div>
                       )}
                     </>
                   )}
                </TabsContent>

                <TabsContent value="requests" className="space-y-6 mt-0">
                   <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 border-b-2 border-foreground pb-4 mb-8">
                      <h3 className="font-heading text-2xl font-black uppercase tracking-tighter">
                        Purchase <span className="text-primary italic">requests</span>
                      </h3>
                      {inboundPurchaseRequestsReady && inboundPurchaseRequests.length > 0 ? (
                        <p className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                          {formatPurchaseLeadTapSummaryLine(purchaseLeadCount, purchaseTapTotal)}
                        </p>
                      ) : null}
                   </div>
                   {!inboundPurchaseRequestsReady ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6" aria-busy="true">
                       <Skeleton className="min-h-[220px] w-full rounded-none border-2 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)]" />
                       <Skeleton className="min-h-[220px] w-full rounded-none border-2 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)]" />
                     </div>
                   ) : inboundPurchaseRequests.length === 0 ? (
                     <div className="bg-background rounded-none p-8 md:p-16 text-center border-4 border-dashed border-border flex flex-col items-center">
                       <MessageCircle className="w-12 h-12 text-muted-foreground mb-6" strokeWidth={1} />
                       <h4 className="font-heading font-black uppercase text-2xl tracking-tighter mb-4 text-foreground">
                         No purchase requests yet
                       </h4>
                       <p className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-8 max-w-md leading-relaxed">
                         When a buyer taps <span className="text-foreground">Request to Buy</span> on one of your listings, it appears here.
                         Repeat taps from the same signed-in buyer stay on one row with an accurate tap count (you still get one alert per buyer per listing).
                       </p>
                       <Button
                         render={<Link to="/browse" />}
                         variant="outline"
                         className="rounded-none px-8 h-12 font-mono text-[10px] border-2 border-foreground uppercase tracking-widest font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all"
                       >
                         View marketplace
                       </Button>
                     </div>
                   ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {inboundPurchaseRequests.map((req) => (
                         <BuyerPurchaseRequestCard
                           key={req.id}
                           mode="seller"
                           req={req}
                           sellerEmail={currentUser?.email}
                           sellerPhone={currentUser?.phone}
                         />
                       ))}
                     </div>
                   )}
                </TabsContent>
                
                <TabsContent value="drafts" className="mt-0 space-y-6">
                   <div className="flex justify-between items-center border-b-2 border-foreground pb-4 mb-8">
                      <h3 className="font-heading text-2xl font-black uppercase tracking-tighter">Saved <span className="text-primary italic">Drafts</span></h3>
                   </div>
                   <div className="space-y-4">
                     {sellDraftSummary ? (
                       <div className="border-2 border-foreground p-6 bg-background shadow-[4px_4px_0_0_rgba(0,0,0,1)] flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                         <div className="min-w-0">
                           <p className="font-heading text-xl font-black uppercase">{sellDraftSummary.title}</p>
                           <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1 leading-relaxed">
                             {sellDraftSummary.subtitle}
                           </p>
                         </div>
                         <Button
                           render={<Link to="/sell" />}
                           variant="outline"
                           className="rounded-none font-mono text-[10px] uppercase font-bold border-2 border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:bg-primary hover:text-primary-foreground transition-all shrink-0"
                         >
                           Resume editing
                         </Button>
                       </div>
                     ) : (
                       <div className="bg-background rounded-none p-8 md:p-16 text-center border-4 border-dashed border-border flex flex-col items-center">
                         <FileText className="w-12 h-12 text-muted-foreground mb-6" strokeWidth={1} />
                         <h4 className="font-heading font-black uppercase text-2xl tracking-tighter mb-4 text-foreground">No saved draft</h4>
                         <p className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-8 max-w-md">
                           Nothing is stored yet. On the Sell page, use <span className="text-foreground">&quot;Save Draft&quot;</span> to keep your listing progress here.
                         </p>
                         <Button
                           render={<Link to="/sell" />}
                           className="rounded-none px-8 h-12 font-mono text-[10px] border-2 border-foreground bg-primary text-primary-foreground uppercase tracking-widest font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all"
                         >
                           Go to Sell
                         </Button>
                       </div>
                     )}
                   </div>
                </TabsContent>
             </Tabs>
          </div>

        </div>

      </div>
      <EditTicketDialog
        ticket={editingTicket}
        isOpen={!!editingTicket}
        onClose={() => setEditingTicket(null)}
      />
      <EditProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        dialogTitle={profileUiLabel}
      />
    </div>
  );
};

export default Dashboard;
