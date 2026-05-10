import * as React from "react";
import { useState, useEffect, useMemo, useCallback, memo, type ReactNode } from "react";
import { Users, AlertTriangle, Shield, CheckCircle2, Ticket as TicketIcon, XCircle, Search, Edit, Trash2, Activity, Plus, TrendingUp, Star, Clock, AlertCircle, FileText, Ban, Settings, LogOut, Check, Phone, Eye, Mail, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BuyerPurchaseRequestCard } from "@/src/components/common/BuyerPurchaseRequestCard";
import { Navigate, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/src/contexts/AuthContext";
import { needsEmailVerification } from "@/src/lib/firebase/authVerification";
import type { TicketReport, Ticket, AdminUserRow, PendingAdminRow, BuyerPurchaseRequest } from "@/src/types";
import { signOut } from "firebase/auth";
import { auth, db } from "@/src/lib/firebase/firebase";
import {
  getTickets,
  getTicket,
  TICKETS_ADMIN_QUERY_LIMIT,
  TICKETS_ADMIN_RECENT_DIALOG_PAGE_SIZE,
  ticketPostedAtMs,
  updateTicketStatus,
  deleteTicket,
  fetchTicketsPostedAtAdminPage,
  fetchTicketsRecentOverview,
} from "@/src/lib/firebase/tickets";
import { scheduleTicketDeleteWithUndo } from "@/src/lib/ticketDeleteUndo";
import {
  fetchTicketAdminNotesForIds,
  saveTicketAdminNote,
  TICKET_ADMIN_NOTE_MAX_CHARS,
} from "@/src/lib/firebase/ticketAdminNotes";
import { enqueueSellerAdminTicketNotification } from "@/src/lib/firebase/sellerTicketNotifications";
import { phoneDisplayToTelHref } from "@/src/lib/env/publicContact";
import { getAllUsers, deleteUserData } from "@/src/lib/firebase/users";
import {
  getAdminNotes,
  getAdminLogs,
  addAdminLog,
  saveAdminNotes,
  type AdminLog,
} from "@/src/lib/firebase/adminSettings";
import { ANONYMOUS_REPORTER_ID, getTicketReports } from "@/src/lib/firebase/ticketReports";
import {
  BUYER_PURCHASE_ADMIN_PAGE_SIZE,
  fetchBuyerPurchaseRequestsOverview,
  fetchBuyerPurchaseRequestsPage,
} from "@/src/lib/firebase/purchaseRequests";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { format, isValid, parseISO } from "date-fns";
import { EditTicketDialog } from "@/src/components/common/EditTicketDialog";
import { formatTicketPostedAtAmPm } from "@/src/lib/formatLocaleDateTime";
import { formatDepartureTimeDisplay } from "@/src/lib/formatDepartureTime";

const AVAILABLE_PERMISSIONS = [
  { id: "manage_users", label: "Manage users", category: "User Management" },
  { id: "view_users", label: "View users", category: "User Management" },
  { id: "delete_users", label: "Delete users", category: "User Management" },
  { id: "suspend_users", label: "Suspend users", category: "User Management" },
  { id: "manage_tickets", label: "Manage ticket listings", category: "Ticket Management" },
  { id: "delete_tickets", label: "Delete ticket listings", category: "Ticket Management" },
  { id: "edit_tickets", label: "Edit ticket listings", category: "Ticket Management" },
  { id: "mark_sold", label: "Mark tickets as sold", category: "Ticket Management" },
  { id: "view_analytics", label: "View analytics", category: "Analytics" },
  { id: "access_dashboard", label: "Access dashboard analytics", category: "Analytics" },
  { id: "view_whatsapp_logs", label: "View WhatsApp request logs", category: "Analytics" },
  { id: "manage_reports", label: "Manage reports", category: "Moderation" },
  { id: "view_admin_logs", label: "View admin logs", category: "Moderation" },
  { id: "manage_notifications", label: "Manage notifications", category: "Moderation" },
  { id: "access_settings", label: "Access settings", category: "Admin Controls" },
  { id: "add_admins", label: "Add new admins", category: "Admin Controls" },
  { id: "remove_admins", label: "Remove admins", category: "Admin Controls" },
  { id: "change_roles", label: "Change admin roles", category: "Admin Controls" },
  { id: "manage_homepage", label: "Manage platform homepage content", category: "Admin Controls" },
];

const PRESETS = {
  "Super Admin": AVAILABLE_PERMISSIONS.map(p => p.id),
  "Moderator": ["view_users", "edit_tickets", "delete_tickets", "manage_reports", "view_admin_logs"],
  "Support Agent": ["view_users", "mark_sold", "manage_notifications"]
};

/** Opens the device dialer (`tel:`); underline on hover to match Contact page links. */
const adminTelLinkClass =
  "underline-offset-4 hover:underline hover:text-foreground text-inherit inline-flex items-center gap-1 max-w-full min-w-0";

/** `DialogContent` ships `sm:max-w-sm`; override with explicit `sm:max-w-*` or width changes never show at desktop. */
const adminPagedOverviewDialogContentClass =
  "rounded-none border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] bg-background w-[calc(100vw-2rem)] max-w-4xl sm:max-w-4xl max-h-[min(90vh,720px)] flex flex-col gap-0 overflow-hidden p-0";

const adminPagedLoadMoreButtonClass =
  "w-full rounded-none border-2 border-foreground font-mono text-[10px] font-black uppercase tracking-widest shadow-[4px_4px_0_0_rgba(0,0,0,1)]";

/** Shared shell for “View all” admin lists (buyer requests, recent ticket posts). */
function AdminPagedOverviewDialog({
  open,
  onOpenChange,
  title,
  loading,
  itemCount,
  hasMore,
  onLoadMore,
  emptyMessage,
  contentClassName,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  loading: boolean;
  itemCount: number;
  hasMore: boolean;
  onLoadMore: () => void;
  emptyMessage: string;
  /** Merged with base shell; use for wider dialogs (e.g. ticket rows). */
  contentClassName?: string;
  children: ReactNode;
}) {
  const showInitialSpinner = loading && itemCount === 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(adminPagedOverviewDialogContentClass, contentClassName)}>
        <DialogHeader className="p-6 pb-4 border-b-4 border-foreground shrink-0 space-y-2">
          <DialogTitle className="font-heading font-black text-xl uppercase tracking-tighter">{title}</DialogTitle>
          <DialogDescription className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
            Newest first
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-0 p-6 pt-4 space-y-3">
          {showInitialSpinner ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground font-mono text-xs font-bold uppercase">
              <Loader2 className="w-8 h-8 animate-spin" aria-hidden />
              Loading…
            </div>
          ) : itemCount === 0 ? (
            <p className="font-mono text-xs font-bold text-muted-foreground">{emptyMessage}</p>
          ) : (
            children
          )}
        </div>
        {hasMore ? (
          <div className="p-4 border-t-4 border-foreground shrink-0 bg-muted/30">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              className={adminPagedLoadMoreButtonClass}
              onClick={onLoadMore}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />
                  Loading…
                </span>
              ) : (
                "Load more"
              )}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** Compact trip line for admin table (avoids raw ISO blobs in cells). */
function formatTripLineForAdmin(dateRaw: string, departureRaw: string): string {
  const dateTrim = (dateRaw ?? "").trim();
  const timeTrim = (departureRaw ?? "").trim();

  let dateLabel = "";
  if (dateTrim) {
    const ymd = dateTrim.includes("T") ? dateTrim.slice(0, 10) : dateTrim;
    const parsed = parseISO(ymd.length >= 10 ? ymd : dateTrim);
    dateLabel = isValid(parsed) ? format(parsed, "MMM d, yyyy") : dateTrim;
  }

  let timeLabel = "";
  if (timeTrim) {
    const fd = formatDepartureTimeDisplay(timeTrim);
    timeLabel = fd !== "—" ? fd : timeTrim;
  }

  if (dateLabel && timeLabel) return `${dateLabel} · ${timeLabel}`;
  return dateLabel || timeLabel || "—";
}

function formatUnknownError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Absolute public URL for `/ticket/:id` (mailto bodies). Prefer `VITE_PUBLIC_SITE_URL` when set so links are not `localhost` in dev. */
function ticketDetailsPageUrl(ticketId: string): string {
  const path = `/ticket/${ticketId}`;
  const site =
    typeof import.meta.env.VITE_PUBLIC_SITE_URL === "string"
      ? import.meta.env.VITE_PUBLIC_SITE_URL.trim()
      : "";
  if (site.length > 0) {
    try {
      return new URL(path, site).href;
    } catch {
      /* fall through */
    }
  }
  if (typeof window === "undefined") return path;
  try {
    return new URL(path, window.location.origin).href;
  } catch {
    return path;
  }
}

/** SPA navigation to the public listing detail route (`/ticket/:id`). */
function AdminTicketPublicListingLink({
  ticketId,
  className,
  title = "Open listing",
}: {
  ticketId: string;
  className?: string;
  title?: string;
}) {
  return (
    <Link to={`/ticket/${ticketId}`} className={className} title={title}>
      {ticketId}
    </Link>
  );
}

/**
 * Plain-text listing URL line for mail bodies. `mailto` payloads are plain text—HTML `<a>` tags show verbatim.
 * Most mail apps auto-link a standalone https URL line.
 */
function listingDetailsMailLinkBlock(absUrl: string): string {
  return `Public listing page:\n${absUrl}\n`;
}

function ticketSellerDisplayName(ticket: Ticket, sellerRow: AdminUserRow | undefined): string {
  return ticket.sellerName?.trim() || sellerRow?.name?.trim() || "Unknown User";
}

function ticketSellerMailtoDisplayName(ticket: Ticket, sellerRow: AdminUserRow | undefined): string {
  const n = ticket.sellerName?.trim() || sellerRow?.name?.trim();
  return n || "there";
}

/** Prefilled subject/body for admin → seller email from Manage Tickets. */
function adminSellerMailtoHref(
  email: string,
  ctx: { sellerDisplayName: string; ticketId: string },
): string {
  const addr = email.trim();
  const subject = `[TransitSwap] Official correspondence regarding your listing (Ticket ID: ${ctx.ticketId})`;
  const listingUrl = ticketDetailsPageUrl(ctx.ticketId);
  const body =
    `Dear ${ctx.sellerDisplayName},\n\n` +
    `Thank you for using TransitSwap.\n\n` +
    `TransitSwap Support is contacting you regarding the listing identified below. This message may relate to routine listing administration—for example verification steps, alignment with listing policies, buyer coordination, or updates pertinent to your ticket—as determined during operational review.\n\n` +
    `Please retain the following references whenever you reply so we can assist you promptly:\n\n` +
    `Ticket ID:\n${ctx.ticketId}\n\n` +
    `${listingDetailsMailLinkBlock(listingUrl)}\n` +
    `You may reply directly to this email if you require clarification or further assistance.\n\n` +
    `Kind regards,\n` +
    `TransitSwap Support`;
  return `mailto:${addr}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Prefilled subject/body for ban / account moderation (Manage Users, scam reports). Send-ready universal Trust & Safety notice—only personalization is name plus injected refs/URLs. */
function adminBanModerationMailtoHref(
  email: string,
  ctx: {
    recipientDisplayName: string;
    ticketId?: string;
    reportIdShort?: string;
  },
): string {
  const addr = email.trim();
  const hasListing =
    ctx.ticketId != null && String(ctx.ticketId).trim().length > 0;
  const subject = hasListing
    ? `[TransitSwap] Trust & Safety: Important notice regarding your account (Ticket ID: ${String(ctx.ticketId).trim()})`
    : `[TransitSwap] Trust & Safety: Important notice regarding your account`;

  let referenceBlock = "";
  if (hasListing) {
    const id = String(ctx.ticketId).trim();
    referenceBlock +=
      `Ticket ID:\n` +
      `${id}\n\n` +
      `${listingDetailsMailLinkBlock(ticketDetailsPageUrl(id))}\n`;
  }
  if (ctx.reportIdShort) {
    referenceBlock += `Internal case reference (TransitSwap):\nReport #${ctx.reportIdShort}\n\n`;
  }

  const body =
    `Dear ${ctx.recipientDisplayName},\n\n` +
    `We are writing to you from the TransitSwap Trust & Safety team concerning your TransitSwap account and your activity on our marketplace.\n\n` +
    (referenceBlock
      ? `Please retain the following reference information for any correspondence:\n\n${referenceBlock}\n`
      : "") +
    `TransitSwap operates as a marketplace for ticket resale. To protect buyers, sellers, and the integrity of the platform, we review accounts and listings for compliance with our Terms of Service, posted policies, and applicable legal requirements.\n\n` +
    `You are receiving this formal notice because our Trust & Safety function has assessed matters involving your account or listings under those standards. Such matters may include—but are not limited to—reports from users or third parties, suspected fraud or misrepresentation, listing or transaction disputes, suspected breaches of marketplace rules, or other conduct that may affect safety or trust within TransitSwap.\n\n` +
    `Depending on our findings and the seriousness of the issue, TransitSwap may take proportionate administrative measures permitted under our Terms of Service and policies. Those measures may include warnings or advisories; restriction or suspension of specific listings or account features; removal of content that does not meet our rules; temporary suspension of account access; or permanent termination of access where the circumstances warrant. Any restriction already reflected on your account or listings should be understood as reflecting our position unless we expressly advise otherwise in a subsequent written message.\n\n` +
    `Further correspondence may follow while reviews remain open. Continued or severe breaches after notice may result in further or escalating enforcement without separate preamble beyond what our Terms allow.\n\n` +
    `If you wish to respond—including where you believe a determination may have been made in error—or you seek clarification, reply to this email and include any Ticket IDs or reference identifiers shown above so we may trace your message accurately.\n\n` +
    `Thank you for your cooperation.\n\n` +
    `Kind regards,\n` +
    `TransitSwap Trust & Safety Team`;
  return `mailto:${addr}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function AdminSellerProfileLink({
  ticket,
  sellerRow,
  profileTab,
  linkClassName,
  noSellerIdClassName,
}: {
  ticket: Ticket;
  sellerRow: AdminUserRow | undefined;
  profileTab: "overview" | "tickets";
  linkClassName: string;
  noSellerIdClassName: string;
}) {
  const label = ticketSellerDisplayName(ticket, sellerRow);
  if (!ticket.sellerId) {
    return <span className={noSellerIdClassName}>{ticket.sellerName ?? "—"}</span>;
  }
  return (
    <Link
      to={`/admin/users/${ticket.sellerId}`}
      state={{ tab: profileTab }}
      className={linkClassName}
      title="Open seller profile (admin)"
    >
      {label}
    </Link>
  );
}

/** Seller listing mailto + fallback line (Manage Tickets + Recent Ticket Posts). */
function AdminSellerListingMailRow({
  ticket,
  sellerRow,
  linkClassName,
  fallbackClassName,
  emptyLabel,
  fallbackTitle,
}: {
  ticket: Ticket;
  sellerRow: AdminUserRow | undefined;
  linkClassName: string;
  fallbackClassName: string;
  /** Shown when there is no mailable email and no sellerId to display (e.g. overview cards). */
  emptyLabel?: string;
  fallbackTitle?: string;
}) {
  const email = sellerRow?.email?.trim();
  if (email && looksLikeEmail(email)) {
    return (
      <a
        href={adminSellerMailtoHref(email, {
          sellerDisplayName: ticketSellerMailtoDisplayName(ticket, sellerRow),
          ticketId: ticket.id,
        })}
        className={linkClassName}
        title={`Email ${email}`}
      >
        <Mail className="w-3 h-3 shrink-0" aria-hidden />
        <span className="truncate min-w-0">{email}</span>
      </a>
    );
  }
  const fallbackText = (email || ticket.sellerId || "").trim();
  const shown = fallbackText || emptyLabel || "";
  return (
    <span className={fallbackClassName} title={fallbackTitle ?? String(fallbackText || ticket.sellerId || "")}>
      {shown}
    </span>
  );
}

const RecentTicketPostRow = memo(function RecentTicketPostRow({
  ticket,
  sellerRow,
}: {
  ticket: Ticket;
  sellerRow: AdminUserRow | undefined;
}) {
  const sellerPhone = ticket.sellerPhone || sellerRow?.phone;
  return (
    <div className="flex justify-between items-center border-l-4 border-primary p-3 bg-muted/20 gap-3">
      <div className="min-w-0">
        <p className="font-mono text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {formatTicketPostedAtAmPm(ticket.postedAt)}
        </p>
        <p className="font-heading font-bold text-lg uppercase leading-none mt-1">{ticket.transportName}</p>
        <p className="font-mono text-xs text-muted-foreground mt-1">
          {ticket.from} → {ticket.to}
        </p>
        <AdminTicketPublicListingLink
          ticketId={ticket.id}
          className="mt-1 block font-mono text-[10px] font-black uppercase tracking-widest text-primary underline-offset-2 hover:underline break-all max-w-full"
        />
      </div>
      <div className="text-right flex flex-col items-end gap-0.5 min-w-0 max-w-[58%] shrink-0">
        <p className="font-heading text-xl font-black tracking-tighter text-emerald-600">৳{ticket.sellingPrice}</p>
        <AdminSellerProfileLink
          ticket={ticket}
          sellerRow={sellerRow}
          profileTab="overview"
          linkClassName="font-mono text-[10px] font-bold text-primary underline-offset-2 hover:underline truncate max-w-full text-right"
          noSellerIdClassName="font-mono text-[10px] font-bold text-muted-foreground truncate max-w-full"
        />
        <div className="font-mono text-[10px] mt-0.5 max-w-full flex justify-end">
          <AdminSellerListingMailRow
            ticket={ticket}
            sellerRow={sellerRow}
            linkClassName={`${adminTelLinkClass} justify-end max-w-full`}
            fallbackClassName="text-muted-foreground truncate font-normal text-right"
            emptyLabel="No email on file"
          />
        </div>
        {sellerPhone ? (
          <a
            href={phoneDisplayToTelHref(sellerPhone)}
            className={`font-mono text-[10px] text-muted-foreground mt-1 justify-end ${adminTelLinkClass} max-w-full`}
            title="Call seller"
          >
            <Phone className="w-3 h-3 shrink-0" aria-hidden />
            <span className="truncate min-w-0">{sellerPhone}</span>
          </a>
        ) : (
          <p className="font-mono text-[10px] text-muted-foreground/70 mt-1 italic">No phone on file</p>
        )}
      </div>
    </div>
  );
});

function recentTicketPostRows(items: Ticket[], userById: Map<string, AdminUserRow>) {
  return items.map((ticket) => (
    <RecentTicketPostRow
      key={ticket.id}
      ticket={ticket}
      sellerRow={ticket.sellerId ? userById.get(ticket.sellerId) : undefined}
    />
  ));
}

function buyerRequestCardElements(items: BuyerPurchaseRequest[], userById: Map<string, AdminUserRow>) {
  return items.map((req) => (
    <BuyerPurchaseRequestCard key={req.id} mode="admin" req={req} sellerRow={userById.get(req.sellerId)} />
  ));
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, firebaseUser, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [adminRole, setAdminRole] = useState("Super Admin"); // Super Admin, Moderator, Support Agent
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketAdminNotes, setTicketAdminNotes] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [adminNotes, setAdminNotes] = useState("");
  const [adminsList, setAdminsList] = useState<
    { id: string; name: string; email: string; role: string; permissions: string[]; isSelf: boolean }[]
  >([]);
  const [ticketReports, setTicketReports] = useState<TicketReport[]>([]);
  const [buyerPurchaseOverview, setBuyerPurchaseOverview] = useState<BuyerPurchaseRequest[]>([]);
  const [buyerPurchaseOverviewHasMore, setBuyerPurchaseOverviewHasMore] = useState(false);
  const [buyerPurchaseListOpen, setBuyerPurchaseListOpen] = useState(false);
  const [buyerPurchaseListItems, setBuyerPurchaseListItems] = useState<BuyerPurchaseRequest[]>([]);
  const [buyerPurchaseListCursor, setBuyerPurchaseListCursor] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [buyerPurchaseListHasMore, setBuyerPurchaseListHasMore] = useState(false);
  const [buyerPurchaseListLoading, setBuyerPurchaseListLoading] = useState(false);
  const [recentTicketsOverview, setRecentTicketsOverview] = useState<Ticket[]>([]);
  const [recentTicketsOverviewHasMore, setRecentTicketsOverviewHasMore] = useState(false);
  const [recentTicketsListOpen, setRecentTicketsListOpen] = useState(false);
  const [recentTicketsListItems, setRecentTicketsListItems] = useState<Ticket[]>([]);
  const [recentTicketsListCursor, setRecentTicketsListCursor] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [recentTicketsListHasMore, setRecentTicketsListHasMore] = useState(false);
  const [recentTicketsListLoading, setRecentTicketsListLoading] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);

  const [pendingAdmins, setPendingAdmins] = useState<PendingAdminRow[]>([]);

  const userById = useMemo(() => {
    const m = new Map<string, AdminUserRow>();
    for (const u of users) m.set(u.id, u);
    return m;
  }, [users]);

  const syncBuyerPurchaseOverviewFromServer = useCallback(() => {
    void fetchBuyerPurchaseRequestsOverview().then(({ items, hasMore }) => {
      setBuyerPurchaseOverview(items);
      setBuyerPurchaseOverviewHasMore(hasMore);
    });
  }, []);

  const applyBuyerPurchaseListPage = useCallback(
    (r: Awaited<ReturnType<typeof fetchBuyerPurchaseRequestsPage>>, mode: "replace" | "append") => {
      if (mode === "append") {
        setBuyerPurchaseListItems((prev) => [...prev, ...r.items]);
      } else {
        setBuyerPurchaseListItems(r.items);
      }
      setBuyerPurchaseListCursor(r.endCursor);
      setBuyerPurchaseListHasMore(r.hasMore);
      setBuyerPurchaseListLoading(false);
    },
    [],
  );

  const loadMoreBuyerPurchaseRequests = useCallback(() => {
    if (!buyerPurchaseListCursor || buyerPurchaseListLoading || !buyerPurchaseListHasMore) return;
    setBuyerPurchaseListLoading(true);
    void fetchBuyerPurchaseRequestsPage(BUYER_PURCHASE_ADMIN_PAGE_SIZE, buyerPurchaseListCursor).then((r) =>
      applyBuyerPurchaseListPage(r, "append"),
    );
  }, [
    buyerPurchaseListCursor,
    buyerPurchaseListLoading,
    buyerPurchaseListHasMore,
    applyBuyerPurchaseListPage,
  ]);

  const syncRecentTicketsOverviewFromServer = useCallback(() => {
    void fetchTicketsRecentOverview().then(({ tickets: rows, hasMore }) => {
      setRecentTicketsOverview(rows);
      setRecentTicketsOverviewHasMore(hasMore);
    });
  }, []);

  const applyRecentTicketsListPage = useCallback(
    (r: Awaited<ReturnType<typeof fetchTicketsPostedAtAdminPage>>, mode: "replace" | "append") => {
      if (mode === "append") {
        setRecentTicketsListItems((prev) => [...prev, ...r.tickets]);
      } else {
        setRecentTicketsListItems(r.tickets);
      }
      setRecentTicketsListCursor(r.endCursor);
      setRecentTicketsListHasMore(r.hasMore);
      setRecentTicketsListLoading(false);
    },
    [],
  );

  const loadMoreRecentTickets = useCallback(() => {
    if (!recentTicketsListCursor || recentTicketsListLoading || !recentTicketsListHasMore) return;
    setRecentTicketsListLoading(true);
    void fetchTicketsPostedAtAdminPage(TICKETS_ADMIN_RECENT_DIALOG_PAGE_SIZE, recentTicketsListCursor).then((r) => {
      if (r) applyRecentTicketsListPage(r, "append");
    });
  }, [
    recentTicketsListCursor,
    recentTicketsListLoading,
    recentTicketsListHasMore,
    applyRecentTicketsListPage,
  ]);

  useEffect(() => {
    if (currentUser?.role !== 'admin') return;

    getTickets({ maxResults: TICKETS_ADMIN_QUERY_LIMIT }).then((t) => setTickets(t));
    getAllUsers().then((u) => setUsers(u as AdminUserRow[]));
    getAdminNotes().then((notes) => setAdminNotes(notes ?? ""));
    getAdminLogs().then((loadedLogs) => setLogs(loadedLogs));

    getDocs(query(collection(db, "admins"), where("role", "==", "admin")))
      .then((snapshot) => {
        setAdminsList(
          snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: String(data.name ?? ""),
              email: String(data.email ?? ""),
              role: "Administrator",
              permissions: Array.isArray(data.permissions) ? (data.permissions as string[]) : [],
              isSelf: d.id === currentUser?.id,
            };
          }),
        );
      })
      .catch((err: unknown) => console.error("Failed to load admins", err));

    getTicketReports()
      .then(setTicketReports)
      .catch(() => setTicketReports([]));

    syncBuyerPurchaseOverviewFromServer();
    syncRecentTicketsOverviewFromServer();
  }, [currentUser, syncBuyerPurchaseOverviewFromServer, syncRecentTicketsOverviewFromServer]);

  useEffect(() => {
    if (!buyerPurchaseListOpen || currentUser?.role !== "admin") return;
    let cancelled = false;
    setBuyerPurchaseListLoading(true);
    setBuyerPurchaseListItems([]);
    setBuyerPurchaseListCursor(null);
    setBuyerPurchaseListHasMore(false);
    void fetchBuyerPurchaseRequestsPage(BUYER_PURCHASE_ADMIN_PAGE_SIZE, null).then((r) => {
      if (cancelled) return;
      applyBuyerPurchaseListPage(r, "replace");
    });
    return () => {
      cancelled = true;
    };
  }, [buyerPurchaseListOpen, currentUser?.role, applyBuyerPurchaseListPage]);

  useEffect(() => {
    if (!recentTicketsListOpen || currentUser?.role !== "admin") return;
    let cancelled = false;
    setRecentTicketsListLoading(true);
    setRecentTicketsListItems([]);
    setRecentTicketsListCursor(null);
    setRecentTicketsListHasMore(false);
    void fetchTicketsPostedAtAdminPage(TICKETS_ADMIN_RECENT_DIALOG_PAGE_SIZE, null).then((r) => {
      if (cancelled || !r) return;
      applyRecentTicketsListPage(r, "replace");
    });
    return () => {
      cancelled = true;
    };
  }, [recentTicketsListOpen, currentUser?.role, applyRecentTicketsListPage]);

  useEffect(() => {
    const tab = (location.state as { tab?: string } | null)?.tab;
    const allowed = new Set(["overview", "tickets", "users", "reports", "logs", "admins"]);
    if (tab && allowed.has(tab)) setActiveTab(tab);
  }, [location.state, location.key]);

  const ticketIdsKey = tickets.map((t) => t.id).sort().join("|");

  useEffect(() => {
    if (currentUser?.role !== "admin") return;
    if (tickets.length === 0) {
      setTicketAdminNotes({});
      return;
    }
    const ids = tickets.map((t) => t.id);
    let cancelled = false;
    void fetchTicketAdminNotesForIds(ids).then((map) => {
      if (cancelled) return;
      setTicketAdminNotes((prev) => {
        const next: Record<string, string> = {};
        for (const id of ids) {
          next[id] = id in map ? map[id] : (prev[id] ?? "");
        }
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [ticketIdsKey, currentUser?.role]); // eslint-disable-line react-hooks/exhaustive-deps -- ticketIdsKey tracks listing ids

  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<keyof typeof PRESETS>("Moderator");

  const handleAddAdmin = () => {
    toast.info("New admins register at /admin/register; approve pending requests below.");
  };

  const handleRemoveAdmin = (_adminId: string) => {
    toast.info("Removing admins is not available here; manage accounts in Firebase Console if needed.");
  };

  // Ticket Filters
  const [searchTicket, setSearchTicket] = useState("");
  const [filterTicketStatus, setFilterTicketStatus] = useState("all");

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentEditTicket, setCurrentEditTicket] = useState<Ticket | null>(null);
  const [staffNoteTicket, setStaffNoteTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    
    const fetchPendingAdmins = async () => {
      try {
        const q = query(collection(db, "admins"), where("role", "==", "pending_admin"));
        const snapshot = await getDocs(q);
        const approvals: PendingAdminRow[] = [];
        snapshot.forEach((docSnap) => {
          approvals.push({ id: docSnap.id, ...docSnap.data() } as PendingAdminRow);
        });
        setPendingAdmins(approvals);
      } catch (err: unknown) {
        console.error("Failed to fetch pending admins", err);
      }
    };
    fetchPendingAdmins();
  }, [currentUser]);

  const destinationCounts = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const t of tickets) {
      const key = t.to;
      acc[key] = (acc[key] ?? 0) + 1;
    }
    return acc;
  }, [tickets]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-mono uppercase font-bold tracking-widest text-muted-foreground">Verifying access...</div>;
  }

  if (firebaseUser && needsEmailVerification(firebaseUser)) {
    return <Navigate to="/verify-email" replace />;
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }

  const handleApproveAdmin = async (userId: string) => {
    try {
      await updateDoc(doc(db, "admins", userId), { role: "admin" });
      setPendingAdmins(pendingAdmins.filter(a => a.id !== userId));
      toast.success("Administrator approved successfully.");
    } catch (err: unknown) {
      toast.error("Failed to approve administrator: " + formatUnknownError(err));
    }
  };

  const handleRejectAdmin = async (userId: string) => {
    try {
      // Import deleteDoc from firebase/firestore if not already present or simply use updateDoc
      await updateDoc(doc(db, "admins", userId), { role: "rejected" }); 
      setPendingAdmins(pendingAdmins.filter(a => a.id !== userId));
      toast.success("Administrator request rejected.");
    } catch (err: unknown) {
      toast.error("Failed to reject administrator: " + formatUnknownError(err));
    }
  };

  const handleTogglePermission = (adminId: string, permissionId: string) => {
    setAdminsList(adminsList.map(admin => {
      if (admin.id === adminId) {
        let newPerms;
        if (admin.permissions.includes(permissionId)) {
          newPerms = admin.permissions.filter(p => p !== permissionId);
        } else {
          newPerms = [...admin.permissions, permissionId];
        }
        return { ...admin, permissions: newPerms };
      }
      return admin;
    }));
    toast.success("Permissions updated");
  };

  const handleSelectPreset = (adminId: string, roleName: keyof typeof PRESETS) => {
    setAdminsList(adminsList.map(admin => {
      if (admin.id === adminId) {
        return { ...admin, role: roleName, permissions: [...PRESETS[roleName]] };
      }
      return admin;
    }));
    toast.success(`Role updated to ${roleName}`);
  };

  const addLog = (action: string, details: string) => {
    const newLog = { id: String(Date.now()), action, details, time: "Just now", createdAt: new Date() };
    setLogs([newLog, ...logs]);
    void addAdminLog(action, details);
  };

  const handleToggleSold = (id: string) => {
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket) return;
    const prevStatus = ticket.status;
    const newStatus = ticket.status === "sold" ? "available" : "sold";
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)),
    );

    void updateTicketStatus(id, newStatus)
      .then(() => {
        addLog("Ticket Status Toggle", `Toggled sold status for ${id} to ${newStatus}`);
        toast.success("Ticket status updated to " + newStatus);
        enqueueSellerAdminTicketNotification({
          sellerUserId: ticket.sellerId,
          ticketId: ticket.id,
          transportName: ticket.transportName ?? ticket.id,
          kind: "status",
          statusLabel: newStatus,
        });
      })
      .catch((err: unknown) => {
        console.error(err);
        toast.error("Failed to update ticket status.");
        setTickets((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: prevStatus } : t)),
        );
      });
  };

  const handleActionClick = (actionName: string) => {
    if (adminRole === "Support Agent" && ["Ban User", "Delete Ticket"].includes(actionName)) {
      toast.error("Permission Denied", { description: "Support Agents cannot perform this action." });
      return false;
    }
    return true;
  };

  const handleDeleteTicket = (id: string) => {
    if (!handleActionClick("Delete Ticket")) return;
    const removed = tickets.find((t) => t.id === id);
    if (!removed) return;

    setTickets((prev) => prev.filter((t) => t.id !== id));

    const restoreRemoved = () => {
      setTickets((prev) => {
        if (prev.some((t) => t.id === id)) return prev;
        return [...prev, removed].sort((a, b) => ticketPostedAtMs(b) - ticketPostedAtMs(a));
      });
    };

    scheduleTicketDeleteWithUndo({
      ticketId: id,
      message: "Listing removed. Undo within 10 seconds.",
      onUndo: restoreRemoved,
      commitDelete: () => deleteTicket(id),
      onCommitted: () => {
        addLog("Ticket Removed", `Removed listing ${id}`);
        toast.success("Listing deleted.");
        if (removed.sellerId) {
          enqueueSellerAdminTicketNotification({
            sellerUserId: removed.sellerId,
            ticketId: removed.id,
            transportName: removed.transportName ?? removed.id,
            kind: "deleted",
          });
        }
      },
      onCommitFailed: (err: unknown) => {
        console.error(err);
        toast.error("Failed to delete listing.");
        restoreRemoved();
      },
    });
  };

  const handleApproveFlagged = (id: string) => {
    const ticket = tickets.find((t) => t.id === id);
    setTickets(tickets.map((t) => (t.id === id ? { ...t, status: "available" } : t)));
    void updateTicketStatus(id, "available").then(() => {
      addLog("Ticket Approved", `Approved flagged ticket ${id}`);
      toast.success("Ticket approved on marketplace");
      if (ticket?.sellerId) {
        enqueueSellerAdminTicketNotification({
          sellerUserId: ticket.sellerId,
          ticketId: ticket.id,
          transportName: ticket.transportName ?? ticket.id,
          kind: "status",
          statusLabel: "available",
        });
      }
    });
  };

  const handleToggleUserStatus = (id: string, newStatus: string) => {
    if (!handleActionClick("Ban User") && newStatus === "banned") return;
    setUsers(users.map((u) => (u.id === id ? { ...u, status: newStatus } : u)));
    addLog("User Status Updated", `User ${id} is now ${newStatus}`);
    toast.success(`User marked as ${newStatus}`);
  };

  /** Ban ↔ active on one control; unban does not require the Ban User permission gate. */
  const handleToggleBanUser = (userId: string) => {
    const row = userById.get(userId);
    if (!row) {
      toast.error("User is not in the loaded directory. Open Manage Users or refresh the dashboard.");
      return;
    }
    const currentlyBanned = row.status === "banned";
    const next = currentlyBanned ? "active" : "banned";
    if (!currentlyBanned && !handleActionClick("Ban User")) return;
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: next } : u)),
    );
    addLog("User Status Updated", `User ${userId} is now ${next}`);
    toast.success(currentlyBanned ? "User unbanned (active)" : "User banned");
  };

  const handleHardDeleteUser = async (id: string) => {
    if (window.confirm("WARNING: This will permanently delete the user's profile, tickets, notifications, and all associated data. This action cannot be undone. \n\nNote: For complete deletion, Firebase Authentication records may need to be deleted separately in the Firebase Console.\n\nAre you sure you want to proceed?")) {
      void deleteUserData(id)
        .then(() => {
          setUsers(users.filter((u) => u.id !== id));
          addLog("User Hard Deleted", `User ${id} and all their data was permanently deleted`);
          toast.success("User data successfully deleted");
        })
        .catch((err: unknown) => {
          console.error(err);
          toast.error("Failed to delete user data");
        });
    }
  };

  const handleSaveTicketAdminNote = async (ticketId: string, note: string): Promise<boolean> => {
    const uid = firebaseUser?.uid;
    if (!uid) {
      toast.error("You must be signed in to save notes.");
      return false;
    }
    try {
      await saveTicketAdminNote(ticketId, note, uid);
      addLog("Ticket admin note", `Updated internal note for ${ticketId}`);
      toast.success("Admin note saved");
      return true;
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to save admin note");
      return false;
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const q = searchTicket.toLowerCase();
    const sellerLabel = (t.sellerName ?? "").toLowerCase();
    const matchesSearch =
      t.id.toLowerCase().includes(q) ||
      t.transportName.toLowerCase().includes(q) ||
      sellerLabel.includes(q);
    const matchesStatus = filterTicketStatus === "all" || t.status === filterTicketStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] min-h-screen pt-24 pb-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-destructive p-3 border-4 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
              <Shield className="w-8 h-8 text-destructive-foreground" />
            </div>
            <div>
              <h1 className="font-heading text-4xl font-black tracking-tighter uppercase leading-none">Admin Command</h1>
              <p className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mt-2">System overview & moderation</p>
            </div>
          </div>
          <Button
            onClick={() => void signOut(auth).then(() => navigate("/", { replace: true }))}
            variant="outline"
            className="rounded-none border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all flex items-center font-mono text-xs uppercase font-bold tracking-widest h-12"
          >
            <LogOut className="w-4 h-4 mr-2" /> Log Out
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-12">
          <TabsList className="bg-muted p-2 rounded-none border-4 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)] h-auto overflow-x-auto justify-start w-full gap-2 relative">
            <TabsTrigger value="overview" className="data-[state=active]:bg-foreground data-[state=active]:text-background rounded-none px-6 py-3 font-mono text-xs uppercase tracking-widest font-bold">
              Analytics & Overview
            </TabsTrigger>
            <TabsTrigger value="tickets" className="data-[state=active]:bg-foreground data-[state=active]:text-background rounded-none px-6 py-3 font-mono text-xs uppercase tracking-widest font-bold">
              Manage Tickets
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-foreground data-[state=active]:text-background rounded-none px-6 py-3 font-mono text-xs uppercase tracking-widest font-bold">
              Manage Users
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-foreground data-[state=active]:text-background rounded-none px-6 py-3 font-mono text-xs uppercase tracking-widest font-bold">
              Scam & Reports
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-foreground data-[state=active]:text-background rounded-none px-6 py-3 font-mono text-xs uppercase tracking-widest font-bold">
              Audit Logs
            </TabsTrigger>
            {adminRole === "Super Admin" && (
              <TabsTrigger value="admins" className="data-[state=active]:bg-foreground data-[state=active]:text-background rounded-none px-6 py-3 font-mono text-xs uppercase tracking-widest font-bold text-destructive">
                Admins & Roles
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="mt-10 space-y-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-background border-4 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)] p-6 flex flex-col justify-between h-40">
                <div className="flex justify-between items-start">
                  <h3 className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Total Listings</h3>
                  <TicketIcon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-4xl font-heading font-black tracking-tighter">{tickets.length}</div>
                <p className="font-mono text-[10px] text-emerald-600 font-bold uppercase tracking-widest flex items-center"><TrendingUp className="w-3 h-3 mr-1"/> Active tickets</p>
              </div>
              <div className="bg-background border-4 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)] p-6 flex flex-col justify-between h-40">
                <div className="flex justify-between items-start">
                  <h3 className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Active Users</h3>
                  <Users className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="text-4xl font-heading font-black tracking-tighter">{users.length}</div>
                <p className="font-mono text-[10px] text-emerald-600 font-bold uppercase tracking-widest flex items-center"><TrendingUp className="w-3 h-3 mr-1"/> Registered users</p>
              </div>
              <div className="bg-background border-4 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)] p-6 flex flex-col justify-between h-40">
                <div className="flex justify-between items-start">
                  <h3 className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Tickets Sold</h3>
                  <CheckCircle2 className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-4xl font-heading font-black tracking-tighter">{tickets.filter(t => t.status === "sold").length}</div>
                <p className="font-mono text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Lifetime</p>
              </div>
              <div className="bg-destructive border-4 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)] p-6 flex flex-col justify-between h-40 transform rotate-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-mono text-[10px] uppercase tracking-widest font-bold text-destructive-foreground">Pending Items</h3>
                  <AlertTriangle className="w-5 h-5 text-destructive-foreground" />
                </div>
                <div className="text-4xl font-heading font-black tracking-tighter text-destructive-foreground">{tickets.filter(t => t.status === "pending").length}</div>
                <p className="font-mono text-[10px] text-red-200 font-bold uppercase tracking-widest">Needs action</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Daily/Weekly Stats */}
              <div className="bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-8 lg:col-span-2">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b-4 border-foreground pb-4">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <h3 className="font-heading text-2xl font-black uppercase tracking-tighter">Recent Ticket Posts</h3>
                    <Badge className="rounded-none bg-primary text-primary-foreground border-2 border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] font-mono text-[10px] tracking-widest font-black uppercase shrink-0">
                      Live Updates
                    </Badge>
                  </div>
                  {recentTicketsOverviewHasMore ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-none border-2 border-foreground font-mono text-[10px] font-black uppercase tracking-widest shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-px shrink-0"
                      onClick={() => setRecentTicketsListOpen(true)}
                    >
                      View all
                    </Button>
                  ) : null}
                </div>
                <div className="space-y-4">
                  {recentTicketsOverview.length === 0 ? (
                    <p className="font-mono text-xs font-bold text-muted-foreground">No listings yet.</p>
                  ) : (
                    recentTicketPostRows(recentTicketsOverview, userById)
                  )}
                </div>
              </div>

              <AdminPagedOverviewDialog
                open={recentTicketsListOpen}
                onOpenChange={(open) => {
                  setRecentTicketsListOpen(open);
                  if (!open && currentUser?.role === "admin") {
                    syncRecentTicketsOverviewFromServer();
                  }
                }}
                title="Recent ticket posts"
                contentClassName="max-w-6xl sm:max-w-6xl"
                loading={recentTicketsListLoading}
                itemCount={recentTicketsListItems.length}
                hasMore={recentTicketsListHasMore}
                onLoadMore={loadMoreRecentTickets}
                emptyMessage="No listings yet."
              >
                {recentTicketPostRows(recentTicketsListItems, userById)}
              </AdminPagedOverviewDialog>
              
              {/* Most Searched */}
              <div className="bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-8">
                <h3 className="font-heading text-xl font-black uppercase tracking-tighter mb-4 border-b-4 border-foreground pb-2">Top Destinations</h3>
                <div className="space-y-4 font-mono uppercase text-xs font-bold">
                  {Object.entries(destinationCounts)
                    .sort(([, a], [, b]) => Number(b) - Number(a))
                    .slice(0, 10)
                    .map(([name, count], i, arr) => (
                    <div key={name} className="flex flex-col gap-1">
                      <div className="flex justify-between">
                         <span>{i+1}. {name}</span>
                         <span>{count} listings</span>
                      </div>
                      <div className="w-full bg-muted h-2 border border-foreground shadow-[1px_1px_0_0_rgba(0,0,0,1)]">
                         <div className="bg-primary h-full border-r border-foreground" style={{width: `${(Number(count) / Number(arr[0][1])) * 100}%`}}></div>
                      </div>
                    </div>
                  ))}
                  {tickets.length === 0 && <p className="text-muted-foreground">No destinations data yet.</p>}
                </div>
              </div>

              {/* Recent Buyer Requests */}
               <div className="bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-8 lg:col-span-3">
                 <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b-4 border-foreground pb-4">
                   <div className="flex flex-wrap items-center gap-2 min-w-0">
                     <h3 className="font-heading text-xl font-black uppercase tracking-tighter">Recent Buyer Requests</h3>
                     <Badge variant="outline" className="rounded-none border-2 border-foreground font-mono text-[9px] font-black uppercase tracking-widest gap-1 py-0 shrink-0">
                       <MessageCircle className="w-3 h-3 text-emerald-600 shrink-0" aria-hidden />
                       WhatsApp handoff
                     </Badge>
                   </div>
                   {buyerPurchaseOverviewHasMore ? (
                     <Button
                       type="button"
                       variant="outline"
                       className="rounded-none border-2 border-foreground font-mono text-[10px] font-black uppercase tracking-widest shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-px shrink-0"
                       onClick={() => setBuyerPurchaseListOpen(true)}
                     >
                       View all
                     </Button>
                   ) : null}
                 </div>
                 <div
                   className={
                     buyerPurchaseOverview.length === 0 ? "" : "grid grid-cols-1 md:grid-cols-3 gap-4"
                   }
                 >
                   {buyerPurchaseOverview.length === 0 ? (
                     <p className="font-mono text-xs font-bold text-muted-foreground">
                       No buyer requests logged yet. Requests appear when someone taps Request to Buy on a listing.
                     </p>
                   ) : (
                     buyerRequestCardElements(buyerPurchaseOverview, userById)
                   )}
                 </div>
               </div>

              <AdminPagedOverviewDialog
                open={buyerPurchaseListOpen}
                onOpenChange={(open) => {
                  setBuyerPurchaseListOpen(open);
                  if (!open && currentUser?.role === "admin") {
                    syncBuyerPurchaseOverviewFromServer();
                  }
                }}
                title="Buyer purchase requests"
                loading={buyerPurchaseListLoading}
                itemCount={buyerPurchaseListItems.length}
                hasMore={buyerPurchaseListHasMore}
                onLoadMore={loadMoreBuyerPurchaseRequests}
                emptyMessage="No purchase requests yet."
              >
                {buyerRequestCardElements(buyerPurchaseListItems, userById)}
              </AdminPagedOverviewDialog>

              {/* Admin Notes */}
              <div className="bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-8 lg:col-span-3">
                 <h3 className="font-heading text-xl font-black uppercase tracking-tighter mb-4 flex items-center gap-2"><FileText className="w-5 h-5"/> Admin Notes System</h3>
                 <Textarea 
                   value={adminNotes} 
                   onChange={(e) => setAdminNotes(e.target.value)}
                   className="min-h-[100px] border-2 border-foreground rounded-none shadow-[4px_4px_0_0_rgba(0,0,0,1)] font-mono text-xs font-bold p-4 bg-muted/20 resize-none focus-visible:ring-0"
                 />
                 <div className="mt-4 flex justify-end">
                    <Button
                      onClick={() => {
                        void saveAdminNotes(adminNotes).then(() => {
                          toast.success("Notes saved");
                        });
                      }}
                      className="rounded-none font-mono text-[10px] font-black uppercase tracking-widest border-2 border-foreground bg-primary text-primary-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all"
                    >
                      Save Notes
                    </Button>
                 </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tickets" className="mt-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-8 flex flex-col min-h-[600px]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <h3 className="font-heading text-3xl font-black uppercase tracking-tighter bg-foreground text-background px-3 py-1 border-2 border-foreground inline-block">Manage Tickets</h3>
                
                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                  <div className="relative w-full sm:w-56">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Filter by Name/ID/Route..." value={searchTicket} onChange={(e) => setSearchTicket(e.target.value)} className="pl-9 h-10 rounded-none border-2 border-foreground font-mono text-xs shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-background" />
                  </div>
                  <Select value={filterTicketStatus} onValueChange={setFilterTicketStatus}>
                    <SelectTrigger className="w-[140px] rounded-none border-2 border-foreground font-mono text-xs uppercase font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-background">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-2 border-foreground">
                      <SelectItem value="all" className="font-mono text-xs uppercase">All</SelectItem>
                      <SelectItem value="available" className="font-mono text-xs uppercase">Available</SelectItem>
                      <SelectItem value="flagged" className="font-mono text-xs uppercase">Flagged</SelectItem>
                      <SelectItem value="sold" className="font-mono text-xs uppercase">Sold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="overflow-x-auto flex-1 border-t border-b border-muted">
                <table className="w-full text-left font-mono text-[10px] xl:text-xs">
                  <thead className="bg-foreground text-background uppercase tracking-widest font-black border-y-2 border-foreground">
                    <tr>
                      <th className="p-3 border-r-2 border-foreground align-top">Ticket & Route</th>
                      <th className="p-3 border-r-2 border-foreground align-top w-[5.5rem]">Price</th>
                      <th className="p-3 border-r-2 border-foreground align-top max-w-[200px]">User</th>
                      <th className="p-3 border-r-2 border-foreground align-top min-w-[10rem] max-w-[220px]">
                        <span className="block">Meta</span>
                        <span className="block text-[8px] font-normal opacity-90 normal-case tracking-normal font-sans font-medium mt-1 leading-snug">
                          postedAt · views · date · departureTime · staff note (modal)
                        </span>
                      </th>
                      <th className="p-3 border-r-2 border-foreground align-top whitespace-nowrap">Status</th>
                      <th className="p-3 align-top">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((ticket, i) => {
                      const sellerRow = ticket.sellerId ? userById.get(ticket.sellerId) : undefined;
                      return (
                      <tr key={ticket.id} className={`border-b-2 border-foreground ${i % 2 === 0 ? "bg-muted/10" : "bg-background"} hover:bg-muted/50 transition-colors`}>
                        <td className="p-3 border-r-2 border-foreground align-top min-w-0">
                          <p className="font-heading font-bold text-sm xl:text-base uppercase leading-tight">{ticket.transportName}</p>
                          <p className="text-muted-foreground mt-1 space-y-1 leading-snug">
                            <span className="block">{ticket.from} → {ticket.to}</span>
                            <AdminTicketPublicListingLink
                              ticketId={ticket.id}
                              className="block text-primary font-bold underline-offset-2 hover:underline break-all"
                            />
                          </p>
                        </td>
                        <td className="p-3 font-bold border-r-2 border-foreground text-emerald-600 text-sm align-top whitespace-nowrap">৳{ticket.sellingPrice}</td>
                        <td className="p-3 border-r-2 border-foreground align-top min-w-0 max-w-[200px]">
                          <p className="font-bold truncate max-w-full" title={ticketSellerDisplayName(ticket, sellerRow)}>
                            <AdminSellerProfileLink
                              ticket={ticket}
                              sellerRow={sellerRow}
                              profileTab="tickets"
                              linkClassName="text-primary underline-offset-2 hover:underline truncate inline-block max-w-full align-bottom"
                              noSellerIdClassName="font-bold"
                            />
                          </p>
                          <div className="mt-1 min-w-0">
                            <AdminSellerListingMailRow
                              ticket={ticket}
                              sellerRow={sellerRow}
                              linkClassName={`${adminTelLinkClass} font-normal text-[10px] xl:text-xs max-w-full`}
                              fallbackClassName="text-muted-foreground text-[10px] xl:text-xs truncate block"
                              fallbackTitle={String(sellerRow?.email || ticket.sellerId)}
                            />
                          </div>
                          {ticket.sellerPhone && (
                            <a
                              href={phoneDisplayToTelHref(ticket.sellerPhone)}
                              className={`text-muted-foreground mt-1 text-[10px] ${adminTelLinkClass} max-w-full`}
                              title="Open phone app"
                            >
                              <Phone className="w-3 h-3 shrink-0" aria-hidden />
                              <span className="truncate min-w-0">{ticket.sellerPhone}</span>
                            </a>
                          )}
                        </td>
                        <td className="p-3 border-r-2 border-foreground align-top min-w-0 max-w-[220px]">
                           <div className="space-y-2 text-[10px] text-muted-foreground leading-snug">
                             <p>
                               <span className="font-black uppercase tracking-wider text-foreground/85 block mb-0.5">Posted</span>
                               <span className="font-mono">{formatTicketPostedAtAmPm(ticket.postedAt)}</span>
                             </p>
                             <p className="flex items-center gap-1 font-bold">
                               <Eye className="w-3 h-3 shrink-0 text-foreground" aria-hidden />
                               <span>{ticket.views ?? 0} views</span>
                             </p>
                             <p>
                               <span className="font-black uppercase tracking-wider text-foreground/85 block mb-0.5">Trip</span>
                               <span className="font-mono">{formatTripLineForAdmin(ticket.date, ticket.departureTime)}</span>
                             </p>
                           </div>
                           <Button
                             type="button"
                             size="sm"
                             variant="outline"
                             className="mt-2 h-7 w-full max-w-[13rem] rounded-none border-2 border-foreground text-[8px] font-black uppercase shadow-[2px_2px_0_0_rgba(0,0,0,1)] justify-center gap-1"
                             onClick={() => setStaffNoteTicket(ticket)}
                           >
                             <FileText className="w-3 h-3 shrink-0" aria-hidden />
                             Staff note
                             {(ticketAdminNotes[ticket.id] ?? "").trim() ? (
                               <span className="text-emerald-600 font-black" aria-hidden>
                                 ·
                               </span>
                             ) : null}
                           </Button>
                        </td>
                        <td className="p-3 border-r-2 border-foreground align-top">
                          <Badge className={`rounded-none border-2 border-foreground font-black text-[10px] uppercase shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${
                            ticket.status === 'sold' ? 'bg-muted text-muted-foreground' :
                            ticket.status === 'expired' || new Date() > new Date(`${ticket.date}T${ticket.departureTime || '00:00'}`) ? 'bg-red-900 text-red-100' :
                            ticket.status === 'available' ? 'bg-emerald-400 text-emerald-950' : 
                            ticket.status === 'flagged' ? 'bg-destructive text-destructive-foreground' : 
                            'bg-muted text-muted-foreground'
                          }`}>
                            {ticket.status === 'sold' ? 'Sold' : ticket.status === 'expired' || new Date() > new Date(`${ticket.date}T${ticket.departureTime || '00:00'}`) ? 'Expired' : ticket.status}
                          </Badge>
                        </td>
                        <td className="p-3 align-top">
                          <div className="flex flex-wrap gap-1">
                             <Button onClick={() => { setCurrentEditTicket(ticket); setIsEditModalOpen(true); }} size="sm" variant="outline" className="h-7 px-2 rounded-none border-2 border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:bg-blue-500 hover:text-white uppercase font-bold text-[8px]">
                                Edit
                             </Button>
                             <Button onClick={() => handleToggleSold(ticket.id)} size="sm" variant="outline" className={`h-7 px-2 rounded-none border-2 border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] uppercase font-bold text-[8px] ${ticket.status === "sold" ? "hover:bg-sky-500 hover:text-white" : "hover:bg-emerald-500 hover:text-white"}`}>
                                {ticket.status === "sold" ? "Mark Available" : "Mark Sold"}
                             </Button>
                             {ticket.status === 'flagged' && (
                               <Button onClick={() => handleApproveFlagged(ticket.id)} size="sm" variant="outline" className="h-7 px-2 rounded-none border-2 border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:bg-emerald-500 hover:text-white uppercase font-bold text-[8px]">
                                  Approve
                               </Button>
                             )}
                             <Button onClick={() => handleDeleteTicket(ticket.id)} size="sm" variant="destructive" className="h-7 px-2 rounded-none border-2 border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:bg-red-700 uppercase font-bold text-[8px]">
                                Remove
                             </Button>
                          </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>

              <Dialog open={staffNoteTicket !== null} onOpenChange={(open) => !open && setStaffNoteTicket(null)}>
                <DialogContent className="rounded-none border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] bg-background max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="font-heading font-black text-xl uppercase tracking-tighter">
                      Staff note
                    </DialogTitle>
                    <DialogDescription className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                      {staffNoteTicket ? (
                        <>
                          {staffNoteTicket.transportName} ·{" "}
                          <AdminTicketPublicListingLink
                            ticketId={staffNoteTicket.id}
                            className="text-primary underline-offset-2 hover:underline"
                          />
                        </>
                      ) : null}
                    </DialogDescription>
                  </DialogHeader>
                  {staffNoteTicket ? (
                    <div className="space-y-3 pt-2">
                      <Label htmlFor="staff-note-modal" className="font-mono text-[10px] uppercase font-black">
                        Note (admins only)
                      </Label>
                      <Textarea
                        id="staff-note-modal"
                        value={ticketAdminNotes[staffNoteTicket.id] ?? ""}
                        onChange={(e) =>
                          setTicketAdminNotes((prev) => ({
                            ...prev,
                            [staffNoteTicket.id]: e.target.value.slice(0, TICKET_ADMIN_NOTE_MAX_CHARS),
                          }))
                        }
                        placeholder="Internal moderation note…"
                        rows={5}
                        className="rounded-none border-2 border-foreground text-xs font-mono resize-y bg-muted/10 min-h-[120px]"
                      />
                      <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-none border-2 border-foreground font-mono text-[10px] uppercase font-black"
                          onClick={() => setStaffNoteTicket(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          className="rounded-none border-2 border-foreground bg-primary font-mono text-[10px] uppercase font-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                          onClick={() => {
                            void handleSaveTicketAdminNote(
                              staffNoteTicket.id,
                              ticketAdminNotes[staffNoteTicket.id] ?? "",
                            ).then((ok) => {
                              if (ok) setStaffNoteTicket(null);
                            });
                          }}
                        >
                          Save note
                        </Button>
                      </DialogFooter>
                    </div>
                  ) : null}
                </DialogContent>
              </Dialog>
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-8 flex flex-col min-h-[600px]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <h3 className="font-heading text-3xl font-black uppercase tracking-tighter bg-foreground text-background px-3 py-1 border-2 border-foreground inline-block">User Management</h3>
              </div>

               <div className="overflow-x-auto flex-1">
                <table className="w-full text-left font-mono text-[10px] xl:text-xs">
                  <thead className="bg-foreground text-background uppercase tracking-widest font-black border-2 border-foreground">
                    <tr>
                      <th className="p-3 border-r-2 border-foreground">User ID</th>
                      <th className="p-3 border-r-2 border-foreground">Name & Contact</th>
                      <th className="p-3 border-r-2 border-foreground">Performance</th>
                      <th className="p-3 border-r-2 border-foreground">Status / Role</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, i) => (
                      <tr key={user.id} className={`border-2 border-t-0 border-foreground ${i % 2 === 0 ? "bg-muted/10" : "bg-background"} hover:bg-muted/50 transition-colors`}>
                        <td className="p-3 font-bold border-r-2 border-foreground">
                           <p>{user.id}</p>
                           <p className="text-[9px] text-muted-foreground font-normal">Joined: {user.joinedAt}</p>
                        </td>
                        <td className="p-3 border-r-2 border-foreground">
                          <p className="font-heading font-bold text-sm uppercase">
                            <Link
                              to={`/admin/users/${user.id}`}
                              state={{ tab: "users" }}
                              className="text-primary underline-offset-2 hover:underline"
                            >
                              {user.name}
                            </Link>
                          </p>
                          {user.email && looksLikeEmail(user.email) ? (
                            <a
                              href={adminBanModerationMailtoHref(user.email, {
                                recipientDisplayName: user.name || "there",
                              })}
                              className={`text-[10px] text-muted-foreground font-bold ${adminTelLinkClass} inline-flex items-center gap-1 max-w-full mt-0.5`}
                              title="Compose moderation email"
                            >
                              <Mail className="w-3 h-3 shrink-0" aria-hidden />
                              <span className="truncate min-w-0">{user.email}</span>
                            </a>
                          ) : (
                            <p className="text-[10px] text-muted-foreground font-bold">{user.email}</p>
                          )}
                          {user.phone ? (
                            <a
                              href={phoneDisplayToTelHref(user.phone)}
                              className={`text-[10px] text-muted-foreground font-mono ${adminTelLinkClass}`}
                              title="Open phone app"
                            >
                              {user.phone}
                            </a>
                          ) : null}
                        </td>
                        <td className="p-3 font-bold border-r-2 border-foreground">
                           <p>Posts: <span className="text-foreground">{user.ticketsPosted || 0}</span></p>
                           <p>Active Layout: <span className="text-foreground">{user.performance?.active || 0}</span></p>
                           <p>Sold Tickets: <span className="text-foreground">{user.performance?.sold || 0}</span></p>
                        </td>
                        <td className="p-3 border-r-2 border-foreground">
                           <Badge className={`rounded-none border-2 border-foreground font-black text-[10px] uppercase shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${
                            user.status === 'active' ? 'bg-emerald-400 text-emerald-950' : 
                            user.status === 'warned' ? 'bg-amber-400 text-amber-950' : 'bg-destructive text-destructive-foreground'
                          }`}>
                            {user.status}
                          </Badge>
                          <p className="mt-1 font-bold text-muted-foreground uppercase">{user.role}</p>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                             {(user.phone) && (
                               <Button onClick={() => window.open(`https://wa.me/${user.phone.replace(/[^0-9]/g, '')}`, '_blank')} size="icon" variant="outline" className="w-8 h-8 rounded-none border-2 border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all text-emerald-600" title="WhatsApp Contact">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
                               </Button>
                             )}
                             <Button onClick={() => handleToggleUserStatus(user.id, 'suspended')} size="icon" variant="outline" className="w-8 h-8 rounded-none border-2 border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all text-amber-600" title="Suspend User">
                                <AlertCircle className="w-4 h-4" />
                             </Button>
                             <Button
                               onClick={() => handleToggleBanUser(user.id)}
                               size="icon"
                               variant="outline"
                               className={`w-8 h-8 rounded-none border-2 border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all ${
                                 user.status === "banned"
                                   ? "text-emerald-600 hover:bg-emerald-500 hover:text-white"
                                   : "text-destructive hover:bg-destructive hover:text-destructive-foreground"
                               }`}
                               title={user.status === "banned" ? "Unban user" : "Ban user"}
                             >
                               {user.status === "banned" ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                             </Button>
                             <Button onClick={() => handleHardDeleteUser(user.id)} size="icon" variant="outline" className="w-8 h-8 rounded-none border-2 border-destructive bg-destructive/10 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all text-destructive hover:bg-destructive hover:text-destructive-foreground" title="Hard Delete User">
                                <Trash2 className="w-4 h-4" />
                             </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="mt-10 animate-in fade-in zoom-in-95 duration-200">
             <div className="bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-8">
               <h3 className="font-heading text-3xl font-black uppercase tracking-tighter bg-destructive text-destructive-foreground px-3 py-1 border-2 border-foreground inline-block mb-8">Scam Reporting System</h3>
               <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                 {ticketReports.map((report) => {
                   const reporterUser = userById.get(report.reporterId);
                   const reporterIsAnon = report.reporterId === ANONYMOUS_REPORTER_ID;
                   const sellerRow = userById.get(report.sellerId);
                   const sellerBanned = sellerRow?.status === "banned";
                   return (
                   <div key={report.id} className="border-4 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)] p-6 bg-red-50 relative overflow-hidden flex flex-col justify-between">
                     <div className="absolute top-0 right-0 p-4">
                       <AlertCircle className="w-12 h-12 text-red-200" />
                     </div>
                     <div>
                       <h4 className="font-heading font-black text-xl uppercase mb-4 relative z-10">Report #{report.id.slice(0, 8)}</h4>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                         <div className="space-y-2">
                           <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Target listing</p>
                           <p className="font-heading font-bold text-sm uppercase leading-tight text-foreground">{report.ticketName}</p>
                           <div>
                             <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-0.5">Ticket ID</p>
                             <AdminTicketPublicListingLink
                               ticketId={report.ticketId}
                               className="font-mono text-xs font-bold text-primary underline-offset-2 hover:underline break-all inline-block max-w-full"
                               title="Open listing details"
                             />
                           </div>
                         </div>
                         <div>
                           <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Reported seller</p>
                           <p className="font-mono text-xs font-bold leading-tight">
                             <Link
                               to={`/admin/users/${report.sellerId}`}
                               state={{ tab: "reports" }}
                               className="text-primary underline-offset-2 hover:underline font-bold"
                               title="Open seller profile (admin)"
                             >
                               {report.sellerName || "Unknown seller"}
                             </Link>
                           </p>
                           <div className="font-mono text-[10px] mt-0.5 min-w-0">
                             {sellerRow?.email?.trim() ? (
                               looksLikeEmail(sellerRow.email) ? (
                                 <a
                                   href={adminBanModerationMailtoHref(sellerRow.email, {
                                     recipientDisplayName: report.sellerName || sellerRow.name || "there",
                                     ticketId: report.ticketId,
                                     reportIdShort: report.id.slice(0, 8),
                                   })}
                                   className={`${adminTelLinkClass} font-normal break-all inline-flex items-center gap-1 max-w-full`}
                                   title="Compose moderation email (reported seller)"
                                 >
                                   <Mail className="w-3 h-3 shrink-0" aria-hidden />
                                   <span className="min-w-0">{sellerRow.email}</span>
                                 </a>
                               ) : (
                                 <span className="text-foreground font-bold break-all">{sellerRow.email}</span>
                               )
                             ) : (
                               <span className="text-muted-foreground italic">No email on file</span>
                             )}
                           </div>
                           {report.sellerPhone?.trim() ? (
                             <a
                               href={phoneDisplayToTelHref(report.sellerPhone)}
                               className={`font-mono text-[10px] mt-1 ${adminTelLinkClass}`}
                               title="Open phone app"
                             >
                               <Phone className="w-3 h-3 shrink-0" aria-hidden />
                               <span>{report.sellerPhone}</span>
                             </a>
                           ) : (
                             <p className="font-mono text-[10px] mt-1 text-muted-foreground">—</p>
                           )}
                         </div>
                       </div>

                       <div className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2 space-y-1">
                         <span className="block">Reporter</span>
                         {reporterIsAnon ? (
                           <span className="text-foreground font-mono normal-case tracking-normal font-bold">
                             Guest (not signed in)
                           </span>
                         ) : (
                           <span className="normal-case tracking-normal block">
                             <Link
                               to={`/admin/users/${report.reporterId}`}
                               state={{ tab: "reports" }}
                               className="font-bold text-primary underline-offset-2 hover:underline"
                               title="Open reporter profile (admin)"
                             >
                               {reporterUser?.name ?? "Unknown user"}
                             </Link>
                             <div className="font-mono text-[10px] font-normal mt-0.5 min-w-0">
                               {reporterUser?.email?.trim() ? (
                                 looksLikeEmail(reporterUser.email) ? (
                                   <a
                                     href={`mailto:${reporterUser.email.trim()}`}
                                     className={`${adminTelLinkClass} font-bold break-all inline-flex items-center gap-1 max-w-full`}
                                     title={`Email ${reporterUser.email}`}
                                   >
                                     <Mail className="w-3 h-3 shrink-0" aria-hidden />
                                     <span className="min-w-0">{reporterUser.email}</span>
                                   </a>
                                 ) : (
                                   <span className="text-foreground font-bold break-all">{reporterUser.email}</span>
                                 )
                               ) : (
                                 <span className="text-muted-foreground italic">No email on file</span>
                               )}
                             </div>
                           </span>
                         )}
                       </div>

                       <div className="font-mono text-xs mb-4 p-3 bg-white border border-foreground">
                         <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Reason:</p>
                         <p>"{report.reason}"</p>
                       </div>
                     </div>

                     <div className="flex flex-wrap gap-2 mt-4 relative z-10">
                       <Button
                         onClick={() => handleToggleBanUser(report.sellerId)}
                         className={`rounded-none font-mono text-[10px] uppercase font-bold border-2 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-y-1 transition-all ${
                           sellerBanned
                             ? "border-foreground bg-background text-foreground hover:bg-emerald-500 hover:text-white"
                             : "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90"
                         }`}
                       >
                         {sellerBanned ? "Unban User" : "Ban User"}
                       </Button>
                       <Button onClick={() => handleDeleteTicket(report.ticketId)} variant="outline" className="rounded-none font-mono text-[10px] uppercase font-bold border-2 border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-y-1 transition-all">Remove Ticket</Button>
                     </div>
                   </div>
                   );
                 })}
                 
                 {ticketReports.length === 0 && (
                   <div className="border-4 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)] p-6 bg-muted/20 flex items-center justify-center min-h-[200px]">
                     <div className="text-center">
                       <h4 className="font-heading font-black text-xl uppercase mb-2 text-muted-foreground">No Active Reports</h4>
                       <p className="font-mono text-xs font-bold text-muted-foreground">System is currently clear.</p>
                     </div>
                   </div>
                 )}
               </div>
             </div>
          </TabsContent>

          <TabsContent value="logs" className="mt-10 animate-in fade-in zoom-in-95 duration-200">
             <div className="bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-8">
                <h3 className="font-heading text-3xl font-black uppercase tracking-tighter bg-muted text-foreground px-3 py-1 border-2 border-foreground inline-block mb-8">Audit Logs</h3>
                <div className="space-y-4">
                  {logs.map((activity, i) => (
                     <div key={activity.id} className="flex flex-col md:flex-row md:items-center justify-between border-2 border-foreground p-4 bg-background shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                        <div className="flex gap-4 items-center mb-2 md:mb-0">
                           <Activity className="w-5 h-5 text-muted-foreground shrink-0" />
                           <div>
                              <p className="font-heading font-black uppercase text-lg leading-none">{activity.action}</p>
                              <p className="font-mono text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-widest">{activity.details}</p>
                           </div>
                        </div>
                        <div className="font-mono text-[10px] font-bold bg-foreground text-background px-3 py-1 uppercase tracking-widest border border-foreground">
                           {activity.time}
                        </div>
                     </div>
                  ))}
                </div>
             </div>
          </TabsContent>

          <TabsContent value="admins" className="mt-10 animate-in fade-in zoom-in-95 duration-200">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Admin List Column */}
                <div className="lg:col-span-1 space-y-4">
                   {pendingAdmins.length > 0 && (
                      <div className="bg-amber-100 border-4 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)] p-6 mb-8">
                         <div className="flex justify-between items-center mb-6 border-b-2 border-foreground pb-4">
                            <h3 className="font-heading text-2xl font-black uppercase tracking-tighter text-amber-900 flex items-center gap-2">
                               <AlertCircle className="w-5 h-5"/> Pending Requests
                            </h3>
                            <Badge className="bg-amber-500 text-black hover:bg-amber-500 rounded-none border-2 border-foreground">{pendingAdmins.length}</Badge>
                         </div>
                         <div className="space-y-3">
                            {pendingAdmins.map(admin => (
                               <div key={admin.id} className="border-2 border-foreground bg-background p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                                  <h4 className="font-heading font-black text-lg">{admin.name}</h4>
                                  <p className="font-mono text-[10px] text-muted-foreground mt-1 mb-3">{admin.email}</p>
                                  <div className="flex gap-2">
                                     <Button onClick={() => handleApproveAdmin(admin.id)} size="sm" className="flex-1 rounded-none border-2 border-foreground bg-emerald-500 text-white hover:bg-emerald-600 font-bold uppercase text-[10px]">Approve</Button>
                                     <Button onClick={() => handleRejectAdmin(admin.id)} size="sm" className="flex-1 rounded-none border-2 border-foreground bg-destructive text-white hover:bg-red-600 font-bold uppercase text-[10px]">Reject</Button>
                                  </div>
                               </div>
                            ))}
                         </div>
                      </div>
                   )}

                   <div className="bg-background border-4 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)] p-6">
                      <div className="flex justify-between items-center mb-6 border-b-2 border-foreground pb-4">
                         <h3 className="font-heading text-2xl font-black uppercase tracking-tighter">System Admins</h3>
                         <Button onClick={() => setIsAddAdminOpen(true)} size="sm" variant="outline" className="rounded-none border-2 border-foreground hover:bg-foreground hover:text-background font-mono text-[10px] uppercase font-bold"><Plus className="w-4 h-4 mr-1"/> New</Button>
                      </div>
                      
                      <div className="space-y-3">
                         {adminsList.map(admin => (
                            <div 
                               key={admin.id} 
                               onClick={() => setSelectedAdminId(admin.id)}
                               className={`border-2 p-4 cursor-pointer transition-all ${selectedAdminId === admin.id ? 'border-primary bg-primary/5 shadow-[4px_4px_0_0_rgba(16,185,129,1)]' : 'border-foreground bg-background shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1'}`}
                            >
                               <div className="flex justify-between items-start">
                                  <div>
                                     <h4 className="font-heading font-black text-lg flex items-center gap-2">
                                        {admin.name} 
                                        {admin.isSelf && <Badge variant="default" className="text-[8px] px-1 h-4 rounded-none bg-foreground text-background">YOU</Badge>}
                                     </h4>
                                     <p className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mt-1">{admin.role}</p>
                                  </div>
                                  <Shield className={`w-5 h-5 ${admin.role === 'Super Admin' ? 'text-destructive' : 'text-primary'}`} />
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>

                {/* Permissions Config Column */}
                <div className="lg:col-span-2">
                   {selectedAdminId ? (() => {
                      const admin = adminsList.find(a => a.id === selectedAdminId)!;
                      return (
                         <div className="bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-8">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-4 border-foreground pb-6 mb-8 gap-4">
                               <div>
                                  <h3 className="font-heading text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
                                     <Settings className="w-8 h-8 text-primary" />
                                     Manage Access
                                  </h3>
                                  <p className="font-mono text-xs uppercase tracking-widest font-bold text-muted-foreground mt-2">Editing permissions for {admin.name}</p>
                               </div>
                               {!admin.isSelf && (
                                  <div className="flex gap-2">
                                     <Button onClick={() => handleRemoveAdmin(admin.id)} variant="outline" size="sm" className="rounded-none border-2 border-destructive text-destructive font-mono text-[10px] uppercase font-bold shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:bg-destructive hover:text-white transition-all">
                                        <Trash2 className="w-4 h-4 mr-1" />
                                        Remove Admin
                                     </Button>
                                  </div>
                               )}
                            </div>

                            {!admin.isSelf && (
                               <div className="mb-8 p-6 border-2 border-foreground bg-muted flex flex-col sm:flex-row items-center gap-6 justify-between">
                                  <div>
                                     <h4 className="font-heading text-lg font-black uppercase">Role Presets</h4>
                                     <p className="font-mono text-[10px] font-bold text-muted-foreground uppercase mt-1">Apply pre-defined permission sets</p>
                                  </div>
                                  <div className="flex gap-2 flex-wrap">
                                     {Object.keys(PRESETS).map(preset => (
                                        <Button 
                                           key={preset} 
                                           onClick={() => handleSelectPreset(admin.id, preset as keyof typeof PRESETS)}
                                           size="sm" 
                                           variant={admin.role === preset ? 'default' : 'outline'}
                                           className={`rounded-none border-2 font-mono text-[10px] uppercase font-bold shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${admin.role === preset ? 'border-primary bg-primary text-primary-foreground' : 'border-foreground hover:translate-y-1'}`}
                                        >
                                           {preset}
                                        </Button>
                                     ))}
                                  </div>
                               </div>
                            )}

                            {Array.from(new Set(AVAILABLE_PERMISSIONS.map(p => p.category))).map(category => (
                               <div key={category} className="mb-8 last:mb-0">
                                  <h4 className="font-heading text-xl font-black uppercase mb-4 py-2 border-b-2 border-dashed border-foreground/30 text-foreground/70">{category}</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     {AVAILABLE_PERMISSIONS.filter(p => p.category === category).map(permission => {
                                        const isEnabled = admin.permissions.includes(permission.id);
                                        return (
                                           <div 
                                              key={permission.id}
                                              className={`flex items-center justify-between p-4 border-2 transition-colors ${isEnabled ? 'border-emerald-500 bg-emerald-500/5' : 'border-border bg-background'}`}
                                           >
                                              <Label htmlFor={`perm-${admin.id}-${permission.id}`} className="font-mono font-bold text-xs uppercase cursor-pointer flex-1 user-select-none">
                                                 {permission.label}
                                              </Label>
                                              <Switch 
                                                 id={`perm-${admin.id}-${permission.id}`}
                                                 checked={isEnabled}
                                                 onCheckedChange={() => handleTogglePermission(admin.id, permission.id)}
                                                 disabled={admin.isSelf}
                                                 className="data-[state=checked]:bg-emerald-500 rounded-none border-2 border-foreground"
                                              />
                                           </div>
                                        );
                                     })}
                                  </div>
                               </div>
                            ))}
                         </div>
                      );
                   })() : (
                      <div className="h-full min-h-[400px] border-4 border-dashed border-foreground/20 flex flex-col items-center justify-center text-center p-8 bg-muted/20">
                         <Shield className="w-16 h-16 text-muted-foreground/30 mb-4" />
                         <h3 className="font-heading text-2xl font-black uppercase tracking-tighter text-muted-foreground">No Admin Selected</h3>
                         <p className="font-mono text-xs uppercase tracking-widest font-bold text-muted-foreground/50 mt-2">Select an admin from the list to view and manage their permissions.</p>
                      </div>
                   )}
                </div>
             </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Admin Modal */}
      <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
        <DialogContent className="rounded-none border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] bg-background">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-2xl uppercase tracking-tighter flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" /> Add New Admin
            </DialogTitle>
            <DialogDescription className="font-mono text-xs font-bold uppercase tracking-widest mt-2">
              Create a new administrator account and assign initial role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Admin Name</Label>
              <Input 
                value={newAdminName} 
                onChange={e => setNewAdminName(e.target.value)} 
                placeholder="Name" 
                className="rounded-none border-2 border-foreground font-mono text-xs focus-visible:ring-0 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Email Address</Label>
              <Input 
                value={newAdminEmail} 
                onChange={e => setNewAdminEmail(e.target.value)} 
                placeholder="admin@example.com" 
                type="email"
                className="rounded-none border-2 border-foreground font-mono text-xs focus-visible:ring-0 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Role Preset</Label>
              <Select value={newAdminRole} onValueChange={(v) => setNewAdminRole(v as keyof typeof PRESETS)}>
                <SelectTrigger className="w-full bg-background rounded-none border-2 border-foreground focus:ring-0 focus:border-foreground font-mono text-xs uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-2 border-foreground">
                  {Object.keys(PRESETS).map(preset => (
                    <SelectItem key={preset} value={preset} className="rounded-none focus:bg-foreground focus:text-background font-mono text-xs uppercase">{preset}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-end">
             <Button variant="outline" onClick={() => setIsAddAdminOpen(false)} className="rounded-none font-mono text-[10px] uppercase tracking-widest font-bold border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all">
               Cancel
             </Button>
             <Button onClick={handleAddAdmin} className="rounded-none font-mono text-[10px] uppercase tracking-widest font-bold border-2 border-primary bg-primary text-primary-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all">
               Add Admin
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditTicketDialog
        ticket={currentEditTicket}
        isOpen={isEditModalOpen}
        showListingStatus
        onClose={() => {
          setIsEditModalOpen(false);
          setCurrentEditTicket(null);
        }}
        onSuccess={(ticketId) => {
          const rowBeforeRefresh = tickets.find((t) => t.id === ticketId);
          void getTicket(ticketId)
            .then((refreshed) => {
              if (refreshed) {
                setTickets((prev) => prev.map((t) => (t.id === refreshed.id ? refreshed : t)));
              }
              addLog("Ticket Edited", `Admin edited ticket ${ticketId}`);
              const sellerId = refreshed?.sellerId ?? rowBeforeRefresh?.sellerId;
              if (sellerId) {
                enqueueSellerAdminTicketNotification({
                  sellerUserId: sellerId,
                  ticketId,
                  transportName:
                    refreshed?.transportName ?? rowBeforeRefresh?.transportName ?? ticketId,
                  kind: "edited",
                });
              }
            })
            .catch((err: unknown) => {
              console.error(err);
              toast.error("Ticket saved but failed to refresh the listing.");
            });
        }}
      />
    </div>
  );
}
