export type Role = 'user' | 'admin' | 'pending_admin';

/** Stored on Firestore `users/{uid}` for moderation (defaults to effective `active` when missing). */
export type UserAccountStatus = "active" | "warned" | "suspended" | "banned";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  /** Original Google profile image URL; kept when the user switches to a local `/avatar/*` asset. */
  googleAvatarUrl?: string;
  /** Optional mirror of Firebase Auth `photoURL` on the profile doc (legacy / admin reads). */
  authPhotoURL?: string;
  role: Role;
  joinedAt: string;
  /** Profile phone (shown in admin; optional if not collected). */
  phone?: string;
  /** Moderation flag — persisted by admins (`users.status`). */
  status?: UserAccountStatus;
}

/** Firestore `users` rows may include moderation/analytics fields surfaced in admin UI. */
export interface AdminUserRow extends User {
  ticketsPosted?: number;
  performance?: { active?: number; sold?: number };
}

/** Pending registration docs in `admins` with `role == "pending_admin"`. */
export interface PendingAdminRow {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  permissions?: string[];
}

export type TicketStatus = 'available' | 'sold' | 'pending' | 'expired' | 'flagged' | 'rejected';

export interface Ticket {
  id: string;
  transportName: string;
  transportType: string;
  mode: 'train' | 'bus';
  from: string;
  to: string;
  departureTime: string;
  date: string;
  seatClass: string;
  originalPrice: number;
  sellingPrice: number;
  status: TicketStatus;
  sellerId: string;
  sellerName?: string;
  sellerPhone?: string;
  /** Free-text info from the seller for buyers (Sell flow). */
  additionalNotes?: string;
  postedAt: string;
  passengerCount: number;
  views?: number;
  rejectionReason?: string;
}

/** Stored in Firestore collection `ticketReports`. */
export interface TicketReport {
  id: string;
  ticketId: string;
  ticketName: string;
  sellerId: string;
  sellerName: string;
  sellerPhone: string;
  reason: string;
  reporterId: string;
  createdAt: string;
}

/** Stored in Firestore collection `purchaseRequests` when a buyer taps Request to Buy (WhatsApp opens). */
export interface BuyerPurchaseRequest {
  id: string;
  ticketId: string;
  sellerId: string;
  transportName: string;
  routeFrom: string;
  routeTo: string;
  sellingPrice: number;
  /** Snapshot of `tickets/{id}.sellerPhone` at write time (listing contact). */
  sellerListingPhone?: string;
  /** Listing schedule snapshot (`departureTime`, `date`, `mode`). */
  listingDepartureTime?: string;
  listingTripDate?: string;
  listingTransportMode?: "train" | "bus";
  buyerUserId: string;
  buyerLabel: string;
  createdAt: string;
  /** Signed-in buyers: taps after the first increment this (default 1 for legacy / anonymous rows). */
  requestCount?: number;
  /** Latest tap time (ISO); mirrors `createdAt` when only one tap or legacy doc. */
  lastRequestedAt?: string;
}

export interface Chat {
  id: string;
  userIds: string[];
  lastMessageAt: string;
  lastMessage: string;
  ticketId: string;
  unreadCount?: number;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'alert' | 'info' | 'success';
  title?: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}
