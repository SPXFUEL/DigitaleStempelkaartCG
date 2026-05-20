export interface Customer {
  id: string;
  name: string;
  email?: string;
  /** True zodra de klant op de magic-link in z'n inbox heeft geklikt. */
  emailVerified?: boolean;
  stamps: number;
  totalDrinks: number;
  totalRewards: number;
  rewardAvailable: boolean;
  /** ISO YYYY-MM-DD, optioneel */
  birthday?: string;
  /** Computed: vandaag is je verjaardag én je hebt 'm dit jaar nog niet ingewisseld */
  birthdayActive: boolean;
  /** Customer-id van degene die deze klant heeft aangedragen (referral). */
  referredBy?: string;
  /** Aantal mensen dat deze klant zelf heeft aangedragen. */
  referralsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface StampEvent {
  customerId: string;
  /** "welcome" = welkomstbonus, "referral" = aangedragen door iemand. */
  type: "stamp" | "redeem" | "birthday" | "welcome" | "referral";
  at: string;
  /** Staff-user-id die deze actie deed (null bij legacy gedeelde PIN). */
  staffUserId?: string | null;
  /** True als deze stempel via /api/stamp/undo is teruggedraaid. */
  reversed?: boolean;
}

export interface PushSubscriptionRecord {
  id?: number;
  customerId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
  failureCount: number;
}

export interface StaffUser {
  id: string;
  name: string;
  /** Iedereen kan inloggen met PIN; alleen `role === "admin"` kan staff
   *  beheren (en bv. cron triggers handmatig draaien). */
  role: "barista" | "admin";
  /** scrypt-hash van hun PIN. */
  pinHash: string;
  createdAt: string;
  /** Laatste login-timestamp (voor inactiviteit-cleanup). */
  lastLoginAt?: string;
  /** Soft-delete: deactivated accounts blijven in de audit-log staan maar
   *  kunnen niet inloggen. */
  deactivatedAt?: string;
}

export interface AuditLogEntry {
  id?: number;
  /** Welke actie. */
  action:
    | "stamp"
    | "stamp_undo"
    | "redeem"
    | "redeem_birthday"
    | "customer_create"
    | "customer_delete"
    | "staff_login"
    | "staff_login_failed"
    | "staff_create"
    | "staff_deactivate";
  /** Welk klant-id (null voor staff-acties zonder klant-context). */
  customerId?: string | null;
  /** Welke staff. */
  staffUserId?: string | null;
  /** IP / user-agent fingerprint voor incident-onderzoek. */
  ip?: string | null;
  userAgent?: string | null;
  /** Optionele context (bv. reden voor undo). */
  meta?: Record<string, unknown>;
  at: string;
}

export interface EmailVerificationToken {
  token: string;
  customerId: string;
  /** Te valideren e-mail (kan afwijken van customer.email bij wijziging). */
  email: string;
  expiresAt: string;
  consumedAt?: string;
}

export interface StoreShape {
  customers: Record<string, CustomerRecord>;
  events: StampEvent[];
  pushSubscriptions?: PushSubscriptionRecord[];
  staffUsers?: StaffUser[];
  auditLog?: AuditLogEntry[];
  emailTokens?: EmailVerificationToken[];
}

/** Raw customer zoals opgeslagen in de file-store (zonder computed velden) */
export interface CustomerRecord {
  id: string;
  name: string;
  email?: string;
  emailVerified?: boolean;
  stamps: number;
  totalDrinks: number;
  totalRewards: number;
  rewardAvailable: boolean;
  birthday?: string;
  birthdayRedeemedYear?: number;
  referredBy?: string;
  referralsCount?: number;
  createdAt: string;
  updatedAt: string;
}
