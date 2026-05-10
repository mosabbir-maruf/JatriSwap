import { useEffect, useState } from "react";
import type { Notification, User } from "@/src/types";
import { subscribeToNotifications } from "@/src/lib/firebase/notifications";

/** Live notifications for the signed-in seller (Dashboard sidebar + `/alerts`). */
export function useSellerNotificationsSubscription(
  authLoading: boolean,
  currentUser: User | null | undefined,
  firebaseUid: string | undefined,
): { notifications: Notification[]; notificationsReady: boolean } {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsReady, setNotificationsReady] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      setNotifications([]);
      setNotificationsReady(false);
      return;
    }
    setNotificationsReady(false);
    const sellerUid = firebaseUid ?? currentUser.id;
    return subscribeToNotifications(sellerUid, (rows) => {
      setNotifications(rows);
      setNotificationsReady(true);
    });
  }, [authLoading, currentUser, firebaseUid]);

  return { notifications, notificationsReady };
}
