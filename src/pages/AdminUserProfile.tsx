import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import { Activity, ArrowLeft, Mail, Phone, Shield, User as UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/src/contexts/AuthContext";
import { needsEmailVerification } from "@/src/lib/firebase/authVerification";
import { getUser } from "@/src/lib/firebase/users";
import { fetchTicketsBySellerIdForAdmin } from "@/src/lib/firebase/tickets";
import { phoneDisplayToTelHref } from "@/src/lib/env/publicContact";
import type { AdminUserRow, Ticket, TicketStatus } from "@/src/types";
import { formatJoinedAtDisplay, formatTicketPostedAtAmPm } from "@/src/lib/formatLocaleDateTime";
import { formatTripLineForAdmin } from "@/src/lib/formatAdminTripLine";
import {
  ADMIN_PROFILE_RETURN_TAB_QUERY,
  adminDashboardPath,
  resolveAdminProfileReturnTab,
} from "@/src/lib/adminDashboardTab";
import { ticketDisplayStatus } from "@/src/lib/ticketExpiration";
import { useTicketDetailAdminLinkState } from "@/src/hooks/useTicketDetailAdminLinkState";
import { cn } from "@/lib/utils";
import { adminTableTdBase, adminTableTdMobileMin12 } from "@/src/lib/adminTableUi";

const adminTelLinkClass =
  "underline-offset-4 hover:underline hover:text-foreground text-primary inline-flex items-center gap-1 max-w-full min-w-0 break-all";

/** Profile often has no `phone`; listings carry `sellerPhone` (see Sell flow). */
function resolveAdminPhoneDisplay(
  profile: AdminUserRow | null | undefined,
  tickets: Ticket[],
): { phone: string; source: "profile" | "listing" } | null {
  const fromProfile = typeof profile?.phone === "string" ? profile.phone.trim() : "";
  if (fromProfile) return { phone: fromProfile, source: "profile" };
  for (const t of tickets) {
    const p = typeof t.sellerPhone === "string" ? t.sellerPhone.trim() : "";
    if (p) return { phone: p, source: "listing" };
  }
  return null;
}

const STATUS_ORDER: TicketStatus[] = ["available", "sold", "pending", "flagged", "rejected", "expired"];

function labelStatus(s: TicketStatus): string {
  switch (s) {
    case "available":
      return "Available";
    case "sold":
      return "Sold";
    case "pending":
      return "Pending review";
    case "flagged":
      return "Flagged";
    case "rejected":
      return "Rejected";
    case "expired":
      return "Expired";
    default:
      return s;
  }
}

function AdminUserStatsPanel({
  tickets,
  profile,
}: {
  tickets: Ticket[];
  profile: AdminUserRow | null;
}) {
  const totalListingsLoaded = tickets.length;
  const docPosts = profile != null && typeof profile.ticketsPosted === "number" ? profile.ticketsPosted : null;

  const byStatus = tickets.reduce<Partial<Record<TicketStatus, number>>>((acc, t) => {
    /** Derived — past-departure tickets count under `expired`, not their stale stored status. */
    const k = ticketDisplayStatus(t);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  const available = byStatus.available ?? 0;
  const sold = byStatus.sold ?? 0;
  const totalViews = tickets.reduce((sum, t) => sum + (typeof t.views === "number" && !Number.isNaN(t.views) ? t.views : 0), 0);
  const trainCount = tickets.filter((t) => t.mode === "train").length;
  const busCount = tickets.filter((t) => t.mode === "bus").length;

  const docActive = profile?.performance?.active;
  const docSold = profile?.performance?.sold;

  const statTile = (label: string, value: number | string, hint?: string) => (
    <div className="border-2 border-foreground p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-muted/10">
      <p className="font-mono text-[10px] font-black uppercase text-muted-foreground">{label}</p>
      <p className="font-heading text-2xl font-black mt-1">{value}</p>
      {hint ? <p className="font-mono text-[9px] text-muted-foreground mt-1 leading-snug">{hint}</p> : null}
    </div>
  );

  return (
    <div className="min-w-0 bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-8 space-y-6">
      <h2 className="font-heading text-xl font-black uppercase tracking-tighter flex flex-wrap items-center gap-2 bg-foreground text-background px-3 py-1 border-2 border-foreground inline-flex">
        <Activity className="w-5 h-5 shrink-0" aria-hidden />
        User statistics
      </h2>
      <p className="font-mono text-[10px] text-muted-foreground font-bold leading-relaxed max-w-3xl">
        Admin-only summary. Counts below use listings loaded for this seller (up to 200). Firestore profile totals may differ if the user has older listings outside this window.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statTile(
          "Listings (loaded)",
          totalListingsLoaded,
          docPosts != null ? `Profile field ticketsPosted: ${docPosts}` : undefined,
        )}
        {statTile("Available", available, docActive != null ? `Profile performance.active: ${docActive}` : undefined)}
        {statTile("Sold", sold, docSold != null ? `Profile performance.sold: ${docSold}` : undefined)}
        {statTile("Total listing views", totalViews.toLocaleString(), "Sum of views across loaded listings")}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {statTile("Train listings", trainCount)}
        {statTile("Bus listings", busCount)}
      </div>

      <div className="min-w-0">
        <p className="font-mono text-[10px] font-black uppercase text-muted-foreground mb-3">Status breakdown</p>
        <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-6">
          {STATUS_ORDER.map((s) => (
            <Badge
              key={s}
              variant="outline"
              className="h-auto min-h-9 w-full min-w-0 shrink items-center justify-center whitespace-normal rounded-none border-2 border-foreground px-3 py-1.5 text-center font-mono text-[10px] font-black uppercase leading-tight shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
            >
              {labelStatus(s)} · {byStatus[s] ?? 0}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminUserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const location = useLocation();
  const adminTicketDetailLinkState = useTicketDetailAdminLinkState();
  const [searchParams] = useSearchParams();
  const { currentUser, firebaseUser, loading } = useAuth();
  const [profile, setProfile] = useState<AdminUserRow | null | undefined>(undefined);
  const [sellerTickets, setSellerTickets] = useState<Ticket[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const backTab = resolveAdminProfileReturnTab(searchParams.get(ADMIN_PROFILE_RETURN_TAB_QUERY));

  useEffect(() => {
    if (!userId || currentUser?.role !== "admin") return;
    let cancelled = false;
    setLoadError(null);
    void (async () => {
      try {
        const [u, tickets] = await Promise.all([
          getUser(userId),
          fetchTicketsBySellerIdForAdmin(userId),
        ]);
        if (cancelled) return;
        setProfile((u ?? null) as AdminUserRow | null);
        setSellerTickets(Array.isArray(tickets) ? tickets : []);
      } catch (e: unknown) {
        if (cancelled) return;
        setProfile(null);
        setSellerTickets([]);
        setLoadError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, currentUser?.role]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono uppercase font-bold tracking-widest text-muted-foreground">
        Verifying access…
      </div>
    );
  }

  if (firebaseUser && needsEmailVerification(firebaseUser)) {
    return <Navigate to="/verify-email" replace />;
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!currentUser || currentUser.role !== "admin") {
    return <Navigate to="/unauthorized" replace />;
  }

  if (!userId) {
    return <Navigate to="/admin" replace />;
  }

  const resolvedPhone =
    profile !== undefined ? resolveAdminPhoneDisplay(profile, sellerTickets) : null;

  return (
    <div className="flex-1 bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] min-h-screen pt-24 pb-24 relative px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        <div className="mb-4 flex flex-col items-start gap-3 sm:mb-5 md:flex-row md:items-start md:justify-between md:gap-6">
          <Button
            variant="outline"
            render={<Link to={adminDashboardPath(backTab)} />}
            className="rounded-none border-2 border-foreground bg-background text-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all inline-flex items-center gap-2 font-mono text-xs uppercase font-bold tracking-widest h-12 px-5"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
            Back to dashboard
          </Button>
          <Badge className="shrink-0 rounded-none border-2 border-foreground font-black text-[10px] uppercase shadow-[2px_2px_0_0_rgba(0,0,0,1)] bg-primary text-primary-foreground px-3 py-1.5 md:self-start">
            Admin view · read-only
          </Badge>
        </div>

        {loadError ? (
          <p className="font-mono text-xs text-destructive font-bold border-2 border-destructive p-4 bg-destructive/10">
            {loadError}
          </p>
        ) : null}

        {profile === undefined ? (
          <div className="font-mono text-xs uppercase font-bold text-muted-foreground">Loading profile…</div>
        ) : profile === null ? (
          <div className="bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-8 space-y-4">
            <h1 className="font-heading text-2xl font-black uppercase tracking-tighter mb-2">No user document</h1>
            <p className="font-mono text-xs text-muted-foreground mb-4">
              Firestore has no <span className="font-bold text-foreground">users/{userId}</span> row. Tickets below may still exist if the ID matches{" "}
              <span className="font-bold text-foreground">sellerId</span>.
            </p>
            {resolvedPhone ? (
              <div className="border-t-2 border-dashed border-muted-foreground/40 pt-4">
                <p className="font-mono text-[10px] font-black uppercase text-muted-foreground mb-1">Phone</p>
                <a href={phoneDisplayToTelHref(resolvedPhone.phone)} className={`${adminTelLinkClass} font-mono text-xs`}>
                  <Phone className="w-4 h-4 shrink-0" aria-hidden />
                  {resolvedPhone.phone}
                </a>
                {resolvedPhone.source === "listing" ? (
                  <p className="font-mono text-[9px] text-muted-foreground mt-1 italic">From seller listings (no profile row).</p>
                ) : null}
              </div>
            ) : (
              <p className="font-mono text-[10px] text-muted-foreground italic">No phone on file.</p>
            )}
          </div>
        ) : (
          <div className="bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-8 space-y-8">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="shrink-0 border-4 border-foreground w-24 h-24 bg-muted overflow-hidden shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UserIcon className="w-10 h-10 text-muted-foreground" aria-hidden />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <h1 className="font-heading text-3xl font-black uppercase tracking-tighter">{profile.name}</h1>
                <div className="flex flex-wrap gap-2 items-center">
                  <Badge
                    className={`rounded-none border-2 border-foreground font-black text-[10px] uppercase shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${
                      profile.status === "active"
                        ? "bg-emerald-400 text-emerald-950"
                        : profile.status === "warned"
                          ? "bg-amber-400 text-amber-950"
                          : profile.status
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {profile.status ?? "—"}
                  </Badge>
                  <span className="font-mono text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                    <Shield className="w-3 h-3" aria-hidden />
                    {profile.role}
                  </span>
                </div>
                <p className="font-mono text-[10px] text-muted-foreground break-all">
                  <span className="font-black uppercase text-foreground/80">User ID · </span>
                  {profile.id}
                </p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  <span className="font-black uppercase text-foreground/80">Joined · </span>
                  {formatJoinedAtDisplay(profile.joinedAt)}
                </p>
                <div className="space-y-2 pt-2">
                  <a href={`mailto:${profile.email.trim()}`} className={`${adminTelLinkClass} font-mono text-xs font-bold`}>
                    <Mail className="w-4 h-4 shrink-0" aria-hidden />
                    {profile.email}
                  </a>
                  {resolvedPhone ? (
                    <div>
                      <a href={phoneDisplayToTelHref(resolvedPhone.phone)} className={`${adminTelLinkClass} font-mono text-xs`}>
                        <Phone className="w-4 h-4 shrink-0" aria-hidden />
                        {resolvedPhone.phone}
                      </a>
                      {resolvedPhone.source === "listing" ? (
                        <p className="font-mono text-[9px] text-muted-foreground mt-1 italic">
                          From latest listing — profile has no phone field.
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="font-mono text-[10px] text-muted-foreground italic">No phone on file.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {profile !== undefined ? (
          <AdminUserStatsPanel tickets={sellerTickets} profile={profile} />
        ) : null}

        <div className="bg-background border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] p-8">
          <h2 className="font-heading text-xl font-black uppercase tracking-tighter mb-6 bg-foreground text-background px-3 py-1 border-2 border-foreground inline-block">
            Listings ({sellerTickets.length})
          </h2>
          {sellerTickets.length === 0 ? (
            <p className="font-mono text-xs text-muted-foreground font-bold">No tickets for this seller ID.</p>
          ) : (
            <div className="overflow-x-auto border-t border-b border-muted">
              <table className="w-full text-left font-mono text-[10px] xl:text-xs">
                <thead className="bg-foreground text-background uppercase tracking-widest font-black border-y-2 border-foreground">
                  <tr>
                    <th className={cn(adminTableTdBase, "whitespace-nowrap")}>Listing</th>
                    <th className={cn(adminTableTdBase, "whitespace-nowrap")}>Route</th>
                    <th className={cn(adminTableTdBase, "min-w-0")}>
                      <span className="block whitespace-nowrap">Posted</span>
                      <span className="mt-1 block font-sans text-[8px] font-medium normal-case leading-snug tracking-normal opacity-90">
                        Trip departure
                      </span>
                    </th>
                    <th className="p-3 align-top whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sellerTickets.map((t, i) => (
                    <tr
                      key={t.id}
                      className={`border-b-2 border-foreground ${i % 2 === 0 ? "bg-muted/10" : "bg-background"}`}
                    >
                      <td className={cn(adminTableTdBase, adminTableTdMobileMin12)}>
                        <Link
                          to={`/ticket/${t.id}`}
                          state={adminTicketDetailLinkState}
                          className="font-bold text-primary underline-offset-2 hover:underline inline-block max-w-full"
                        >
                          <span className="inline-block whitespace-nowrap font-mono">{t.id}</span>
                        </Link>
                        <p className="font-heading font-bold uppercase mt-1 break-words">{t.transportName}</p>
                      </td>
                      <td className={cn(adminTableTdBase, adminTableTdMobileMin12)}>
                        <span className="inline-block whitespace-nowrap">
                          {t.from} → {t.to}
                        </span>
                      </td>
                      <td className={cn(adminTableTdBase, "min-w-0 align-top")}>
                        <div className="space-y-2 leading-snug">
                          <p>
                            <span className="mb-0.5 block font-black uppercase tracking-wider text-foreground/85">
                              Posted
                            </span>
                            <span className="whitespace-nowrap font-mono">{formatTicketPostedAtAmPm(t.postedAt)}</span>
                          </p>
                          <p>
                            <span className="mb-0.5 block font-black uppercase tracking-wider text-foreground/85">
                              Departure
                            </span>
                            <span className="font-mono">{formatTripLineForAdmin(t.date, t.departureTime)}</span>
                          </p>
                        </div>
                      </td>
                      <td className="p-3 align-top font-bold uppercase whitespace-nowrap">{labelStatus(ticketDisplayStatus(t))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
