import { memo } from "react";
import { MessageCircle } from "lucide-react";
import type { Notification as NotificationType } from "@/src/types";
import { formatMediumDateTimeAmPm } from "@/src/lib/formatLocaleDateTime";
import { isSellerPurchaseRequestNotification } from "@/src/lib/firebase/sellerTicketNotifications";
import {
  dashboardAlertsListingClasses,
  isBanOrSuspendAlertNotification,
} from "@/src/lib/moderationNotifications";

export type DashboardAlertRowProps = {
  notification: NotificationType;
  onInteract: (n: NotificationType) => void;
};

export const DashboardAlertRow = memo(function DashboardAlertRow({
  notification: n,
  onInteract,
}: DashboardAlertRowProps) {
  const purchaseLead = isSellerPurchaseRequestNotification(n);
  const modDestructive = isBanOrSuspendAlertNotification(n);
  const surf = dashboardAlertsListingClasses({ purchaseLead, modDestructive, read: n.read });

  return (
    <div className={surf.row} onClick={() => onInteract(n)}>
      {n.type === "alert" && !purchaseLead && (
        <div
          className={`absolute -left-[6px] top-4 border border-background bg-destructive ${surf.markerModifier}`}
          aria-hidden
        />
      )}
      {purchaseLead ? (
        <div className="absolute -left-[6px] top-4 flex items-center justify-center" aria-hidden>
          <MessageCircle className="w-3 h-3 text-emerald-700" />
        </div>
      ) : null}
      <p className={surf.title}>{n.title || n.type.toUpperCase()}</p>
      <p className={surf.message}>{n.message}</p>
      <p className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground mt-2 font-bold">
        {n.createdAt ? formatMediumDateTimeAmPm(n.createdAt) : "Just now"}
      </p>
    </div>
  );
});
