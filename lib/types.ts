export interface Customer {
  id: string;
  name: string;
  email?: string;
  stamps: number;
  totalDrinks: number;
  totalRewards: number;
  rewardAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StampEvent {
  customerId: string;
  type: "stamp" | "redeem";
  at: string;
}

export interface StoreShape {
  customers: Record<string, Customer>;
  events: StampEvent[];
}
