export interface Customer {
  id: string;
  name: string;
  email?: string;
  stamps: number;
  totalDrinks: number;
  totalRewards: number;
  rewardAvailable: boolean;
  /** ISO YYYY-MM-DD, optioneel */
  birthday?: string;
  /** Computed: vandaag is je verjaardag én je hebt 'm dit jaar nog niet ingewisseld */
  birthdayActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StampEvent {
  customerId: string;
  type: "stamp" | "redeem" | "birthday";
  at: string;
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

export interface StoreShape {
  customers: Record<string, CustomerRecord>;
  events: StampEvent[];
  pushSubscriptions?: PushSubscriptionRecord[];
}

/** Raw customer zoals opgeslagen in de file-store (zonder computed velden) */
export interface CustomerRecord {
  id: string;
  name: string;
  email?: string;
  stamps: number;
  totalDrinks: number;
  totalRewards: number;
  rewardAvailable: boolean;
  birthday?: string;
  birthdayRedeemedYear?: number;
  createdAt: string;
  updatedAt: string;
}
