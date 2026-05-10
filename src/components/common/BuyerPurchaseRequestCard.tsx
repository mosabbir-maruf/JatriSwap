import { memo, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { AdminUserRow, BuyerPurchaseRequest, Ticket } from "@/src/types";
import { ANONYMOUS_BUYER_ID } from "@/src/lib/firebase/purchaseRequests";
import { getTicket } from "@/src/lib/firebase/tickets";
import { formatMediumDateTimeAmPm } from "@/src/lib/formatLocaleDateTime";
import { adminUserDisplayLabel } from "@/src/lib/adminDisplay";
import { phoneDisplayToTelHref } from "@/src/lib/env/publicContact";
import {
  mergePurchaseRequestListingSnapshot,
  purchaseRequestNeedsListingFallback,
} from "@/src/lib/formatPurchaseRequest";
import { adminUserProfilePath } from "@/src/lib/adminDashboardTab";

const sellerContactLinkClass =
  "font-mono text-[10px] font-bold text-primary underline-offset-2 hover:underline break-all inline-flex items-center gap-1 max-w-full min-w-0";

/** Buyer | Seller (or Your contact) split — stacks on narrow widths. */
const partiesGridClass =
  "grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 mt-auto pt-2 border-t-2 border-dashed border-foreground/20 sm:divide-x-2 sm:divide-dashed sm:divide-foreground/25";

const partiesColumnClass = "min-w-0 space-y-1 sm:pr-4";
const partiesColumnSecondClass = "min-w-0 space-y-1 sm:pl-4";

function SellerPhoneLinks({
  mergedTel,
  listingPhoneTrim,
  profilePhoneTrim,
  showProfileSecondary,
  primaryLabelWhenListing,
  primaryLabelWhenProfileOnly,
  telTitlePrimary,
}: {
  mergedTel: string;
  listingPhoneTrim: string;
  profilePhoneTrim: string;
  showProfileSecondary: boolean;
  primaryLabelWhenListing: string;
  primaryLabelWhenProfileOnly: string;
  telTitlePrimary: string;
}) {
  const primaryLabel = listingPhoneTrim ? primaryLabelWhenListing : primaryLabelWhenProfileOnly;
  return (
    <>
      <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider font-bold pt-1">{primaryLabel}</p>
      <a href={phoneDisplayToTelHref(mergedTel)} className={`${sellerContactLinkClass} block`} title={telTitlePrimary}>
        {mergedTel}
      </a>
      {showProfileSecondary ? (
        <>
          <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider font-bold pt-1">
            Profile phone
          </p>
          <a
            href={phoneDisplayToTelHref(profilePhoneTrim)}
            className={`${sellerContactLinkClass} block`}
            title="Call profile number"
          >
            {profilePhoneTrim}
          </a>
        </>
      ) : null}
    </>
  );
}

export type BuyerPurchaseRequestCardProps =
  | {
      mode: "seller";
      req: BuyerPurchaseRequest;
      /** Logged-in seller profile — mailto / tel shortcuts on inbound leads. */
      sellerEmail?: string;
      sellerPhone?: string;
    }
  | { mode: "admin"; req: BuyerPurchaseRequest; sellerRow?: AdminUserRow };

function BuyerPurchaseRequestCardInner(props: BuyerPurchaseRequestCardProps) {
  const { req, mode } = props;
  const [listingFallback, setListingFallback] = useState<Ticket | null>(null);

  /** Older `purchaseRequests` rows omit listing snapshots; fill from live ticket when needed. */
  useEffect(() => {
    if (!purchaseRequestNeedsListingFallback(req)) {
      setListingFallback(null);
      return;
    }
    const tid = req.ticketId.trim();
    if (!tid) return;
    let cancelled = false;
    void getTicket(tid).then((t) => {
      if (!cancelled) setListingFallback(t);
    });
    return () => {
      cancelled = true;
    };
  }, [
    req.ticketId,
    req.sellerListingPhone,
    req.listingTripDate,
    req.listingDepartureTime,
    req.listingTransportMode,
  ]);

  const sellerEmailTrim =
    mode === "admin" ? (props.sellerRow?.email ?? "").trim() : (props.sellerEmail ?? "").trim();
  /** Profile phone (users doc); listing phone is snapshotted on the purchase request doc. */
  const profileSellerPhoneTrim =
    mode === "admin" ? (props.sellerRow?.phone ?? "").trim() : (props.sellerPhone ?? "").trim();
  const { listingPhoneTrim: listingSellerPhoneTrim, tripScheduleLine } = mergePurchaseRequestListingSnapshot(
    req,
    listingFallback,
  );
  const mergedSellerPhoneTrim = listingSellerPhoneTrim || profileSellerPhoneTrim;
  const showProfilePhoneSecondary =
    Boolean(listingSellerPhoneTrim && profileSellerPhoneTrim && listingSellerPhoneTrim !== profileSellerPhoneTrim);
  const rc = req.requestCount ?? 1;
  const placedLabel = formatMediumDateTimeAmPm(req.createdAt);
  const lastTapLabel = formatMediumDateTimeAmPm(req.lastRequestedAt ?? req.createdAt);
  const showLastTapLine = rc > 1;

  const shell =
    mode === "seller"
      ? "flex flex-col gap-3 min-w-0 p-5 bg-muted/15 border-4 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)]"
      : "flex flex-col gap-2 h-full min-w-0 p-4 bg-muted/20 border-4 border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,1)]";

  const priceClass =
    mode === "seller"
      ? "font-heading text-lg font-black text-emerald-700 dark:text-emerald-400 leading-none"
      : "font-heading text-base font-black tracking-tighter text-emerald-600 leading-none";

  const headerPb = mode === "seller" ? "pb-3" : "pb-2";

  return (
    <div className={shell}>
      <div className={`flex justify-between items-start gap-2 border-b-2 border-foreground/15 ${headerPb}`}>
        <div className="min-w-0 space-y-1">
          <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest font-bold leading-snug">
            Buy request placed · {placedLabel}
          </p>
          {showLastTapLine ? (
            <p className="font-mono text-[9px] text-foreground/80 font-bold uppercase tracking-wider leading-snug">
              Last WhatsApp tap · {lastTapLabel}
              <span className="text-muted-foreground font-bold"> · {rc} taps</span>
            </p>
          ) : null}
        </div>
        <div className="text-right shrink-0">
          <p className={priceClass}>৳{req.sellingPrice}</p>
          <p className="font-mono text-[8px] text-muted-foreground uppercase tracking-widest font-bold mt-0.5">
            Listed
          </p>
        </div>
      </div>
      <p className="font-heading font-bold text-sm uppercase leading-tight">{req.transportName}</p>
      <p className="font-mono text-[11px] text-muted-foreground leading-snug">
        {req.routeFrom} → {req.routeTo}
      </p>
      {tripScheduleLine ? (
        <p className="font-mono text-[10px] font-bold text-foreground/90 uppercase tracking-wide leading-snug">
          {tripScheduleLine}
        </p>
      ) : null}

      {mode === "admin" ? (
        <>
          <Link
            to={`/ticket/${req.ticketId}`}
            className="font-mono text-[10px] font-black uppercase tracking-widest text-primary underline-offset-2 hover:underline break-all"
            title="Open listing"
          >
            {req.ticketId}
          </Link>
          <div className={partiesGridClass}>
            <div className={partiesColumnClass}>
              <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider font-bold">Buyer</p>
              {req.buyerUserId !== ANONYMOUS_BUYER_ID ? (
                <Link
                  to={adminUserProfilePath(req.buyerUserId, "overview")}
                  className="font-mono text-[10px] font-bold text-primary underline-offset-2 hover:underline break-all line-clamp-2"
                  title="Open buyer profile (admin)"
                >
                  {req.buyerLabel}
                </Link>
              ) : (
                <span className="font-mono text-[10px] font-bold text-muted-foreground">{req.buyerLabel}</span>
              )}
            </div>
            <div className={partiesColumnSecondClass}>
              <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider font-bold">Seller</p>
              <Link
                to={adminUserProfilePath(req.sellerId, "tickets")}
                className="font-mono text-[10px] font-bold text-primary underline-offset-2 hover:underline break-all line-clamp-2 block"
                title="Open seller profile (admin)"
              >
                {adminUserDisplayLabel(props.sellerRow, req.sellerId)}
              </Link>
              {sellerEmailTrim ? (
                <>
                  <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider font-bold pt-1">
                    Seller email
                  </p>
                  <a href={`mailto:${sellerEmailTrim}`} className={`${sellerContactLinkClass} block`} title="Compose email">
                    {sellerEmailTrim}
                  </a>
                </>
              ) : null}
              {mergedSellerPhoneTrim ? (
                <SellerPhoneLinks
                  mergedTel={mergedSellerPhoneTrim}
                  listingPhoneTrim={listingSellerPhoneTrim}
                  profilePhoneTrim={profileSellerPhoneTrim}
                  showProfileSecondary={showProfilePhoneSecondary}
                  primaryLabelWhenListing="Listing phone"
                  primaryLabelWhenProfileOnly="Seller phone"
                  telTitlePrimary="Call seller"
                />
              ) : null}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className={partiesGridClass}>
            <div className={partiesColumnClass}>
              <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider font-bold">Buyer</p>
              <p className="font-mono text-[11px] font-bold text-foreground break-words">
                {req.buyerLabel}
                {req.buyerUserId === ANONYMOUS_BUYER_ID ? (
                  <span className="block font-mono text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-1">
                    Guest (not signed in)
                  </span>
                ) : null}
              </p>
            </div>
            <div className={partiesColumnSecondClass}>
              <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider font-bold">Your contact</p>
              {sellerEmailTrim ? (
                <a href={`mailto:${sellerEmailTrim}`} className={`${sellerContactLinkClass} block`} title="Compose email">
                  {sellerEmailTrim}
                </a>
              ) : null}
              {mergedSellerPhoneTrim ? (
                <SellerPhoneLinks
                  mergedTel={mergedSellerPhoneTrim}
                  listingPhoneTrim={listingSellerPhoneTrim}
                  profilePhoneTrim={profileSellerPhoneTrim}
                  showProfileSecondary={showProfilePhoneSecondary}
                  primaryLabelWhenListing="Listing phone"
                  primaryLabelWhenProfileOnly="Profile phone"
                  telTitlePrimary="Call"
                />
              ) : null}
              {!sellerEmailTrim && !mergedSellerPhoneTrim ? (
                <p className="font-mono text-[10px] font-bold text-muted-foreground leading-snug">
                  Add email in your profile. New leads include the phone number from the listing.
                </p>
              ) : null}
            </div>
          </div>
          <Button
            render={<Link to={`/ticket/${req.ticketId}`} />}
            variant="outline"
            className="mt-auto rounded-none font-mono text-[10px] font-black uppercase tracking-widest border-2 border-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-px"
          >
            Open listing
          </Button>
        </>
      )}
    </div>
  );
}

export const BuyerPurchaseRequestCard = memo(BuyerPurchaseRequestCardInner);
