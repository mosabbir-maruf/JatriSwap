export type Role = 'user' | 'admin' | 'pending_admin';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: Role;
  joinedAt: string;
  /** Profile phone (shown in admin; optional if not collected). */
  phone?: string;
}

/** Firestore `users` rows may include moderation/analytics fields surfaced in admin UI. */
export interface AdminUserRow extends User {
  status?: string;
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
  seatNumber: string;
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
