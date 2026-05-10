import { useCallback, useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardAlertRow } from "@/src/components/common/DashboardAlertRow";
import { MarkAllNotificationsReadButton } from "@/src/components/common/MarkAllNotificationsReadButton";
import { AuthLoadingPlaceholder } from "@/src/components/common/AuthLoadingPlaceholder";
import { useAuth } from "@/src/contexts/AuthContext";
import { needsEmailVerification } from "@/src/lib/firebase/authVerification";
import { markNotificationReadIfUnread } from "@/src/lib/firebase/notifications";
import type { Notification as NotificationType } from "@/src/types";
import Unauthorized from "./Unauthorized";
import {
  alertsSortedForAccountStatus,
  unreadNotificationsCount,
} from "@/src/lib/moderationNotifications";
import { useSellerNotificationsSubscription } from "@/src/hooks/useSellerNotificationsSubscription";

const Alerts = () => {
  const { currentUser, firebaseUser, loading: authLoading } = useAuth();
  const { notifications, notificationsReady } = useSellerNotificationsSubscription(
    authLoading,
    currentUser,
    firebaseUser?.uid,
  );

  const sortedNotifications = useMemo(
    () => alertsSortedForAccountStatus(notifications, currentUser?.status),
    [notifications, currentUser?.status],
  );

  const unreadNotificationCount = useMemo(() => unreadNotificationsCount(notifications), [notifications]);

  const handleNotificationClick = useCallback(async (notif: NotificationType) => {
    await markNotificationReadIfUnread(notif);
  }, []);

  if (authLoading) {
    return <AuthLoadingPlaceholder />;
  }

  if (firebaseUser && needsEmailVerification(firebaseUser)) {
    return <Navigate to="/verify-email" replace />;
  }

  if (!currentUser) {
    return <Unauthorized />;
  }

  const alertsUserId = firebaseUser?.uid ?? currentUser.id;

  return (
    <div className="flex-1 bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] min-h-screen pt-24 pb-24">
      <div className="page-shell">
        <Button
          render={<Link to="/dashboard" />}
          variant="ghost"
          className="mb-8 h-12 rounded-none border-2 border-foreground bg-background shadow-[4px_4px_0_0_rgba(0,0,0,1)] font-mono text-xs uppercase tracking-widest font-bold hover:translate-y-1 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all gap-2"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Back to dashboard
        </Button>

        <div className="mb-12 border-b-4 border-foreground pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="min-w-0 flex items-start gap-4">
            <Bell className="w-10 h-10 md:w-14 md:h-14 text-primary shrink-0 mt-1" aria-hidden />
            <div className="space-y-4">
              <h1 className="font-heading text-5xl md:text-7xl font-black uppercase tracking-tighter text-foreground drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">
                All <span className="text-primary">alerts</span>
              </h1>
              <p className="font-mono text-sm uppercase font-bold tracking-widest text-muted-foreground max-w-2xl">
                Every notification for your account, newest first. Active moderation notices stay pinned while they apply.
              </p>
              {notificationsReady && unreadNotificationCount > 0 ? (
                <Badge
                  variant="default"
                  className="rounded-none px-2 min-w-[28px] justify-center text-[10px] font-mono font-bold bg-primary text-primary-foreground border border-primary shadow-[2px_2px_0_0_rgba(var(--primary-color),1)] w-fit"
                >
                  {unreadNotificationCount} unread
                </Badge>
              ) : null}
            </div>
          </div>
          {notificationsReady && unreadNotificationCount > 0 ? (
            <div className="shrink-0 w-full md:w-auto flex md:justify-end">
              <MarkAllNotificationsReadButton userId={alertsUserId} unreadCount={unreadNotificationCount} />
            </div>
          ) : null}
        </div>

        <div className="border-4 border-foreground shadow-[16px_16px_0_0_rgba(0,0,0,1)] bg-background p-8 md:p-10">
          <div className="space-y-4">
            {!notificationsReady ? (
              <div className="space-y-3" aria-busy="true">
                <Skeleton className="h-14 w-full rounded-none border border-border" />
                <Skeleton className="h-14 w-full rounded-none border border-border" />
                <Skeleton className="h-14 w-full rounded-none border border-border" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest font-bold">
                No alerts yet.
              </p>
            ) : (
              sortedNotifications.map((n) => (
                <DashboardAlertRow key={n.id} notification={n} onInteract={handleNotificationClick} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Alerts;
