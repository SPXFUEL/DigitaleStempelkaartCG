import { todayInAms } from "./birthday";
import { ASSUMED_DRINK_PRICE } from "./constants";
import type { Customer, StampEvent } from "./types";

export interface DashboardKpis {
  totalCustomers: number;
  drinksToday: number;
  drinksLast7Days: number;
  rewardsLast30Days: number;
  birthdaysGivenLast30Days: number;
  revenueGivenAwayLast30Days: number;
  newCustomersLast7Days: number;
}

export interface DayBucket {
  date: string; // YYYY-MM-DD (Amsterdam)
  stamps: number;
  rewards: number;
  birthdays: number;
}

export interface UpcomingBirthday {
  customer: Customer;
  /** YYYY-MM-DD van de aankomende verjaardag (kan dit jaar of volgend jaar zijn) */
  nextDate: string;
  /** Aantal dagen tot die verjaardag (0 = vandaag) */
  daysUntil: number;
}

const AMS_DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Amsterdam",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function dateInAms(d: Date): string {
  return AMS_DATE_FMT.format(d);
}

/**
 * Compute alle KPIs uit een lijst van events.
 */
export function computeKpis(
  totalCustomers: number,
  events: StampEvent[],
  customers: Customer[]
): DashboardKpis {
  const todayStr = todayInAms();

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const since7 = new Date(now - 7 * day).toISOString();
  const since30 = new Date(now - 30 * day).toISOString();

  let drinksToday = 0;
  let drinksLast7 = 0;
  let rewardsLast30 = 0;
  let birthdaysLast30 = 0;

  for (const e of events) {
    const isStampOrRedeem =
      e.type === "stamp" || e.type === "redeem" || e.type === "birthday";
    const dStr = dateInAms(new Date(e.at));
    if (isStampOrRedeem && dStr === todayStr) drinksToday++;
    if (isStampOrRedeem && e.at >= since7) drinksLast7++;
    if (e.type === "redeem" && e.at >= since30) rewardsLast30++;
    if (e.type === "birthday" && e.at >= since30) birthdaysLast30++;
  }

  const newCustomersLast7 = customers.filter((c) => c.createdAt >= since7)
    .length;

  return {
    totalCustomers,
    drinksToday,
    drinksLast7Days: drinksLast7,
    rewardsLast30Days: rewardsLast30,
    birthdaysGivenLast30Days: birthdaysLast30,
    revenueGivenAwayLast30Days:
      (rewardsLast30 + birthdaysLast30) * ASSUMED_DRINK_PRICE,
    newCustomersLast7Days: newCustomersLast7,
  };
}

/**
 * Groepeer events per dag (Amsterdam-tijd) voor de afgelopen N dagen.
 * Vult dagen zonder events met nullen aan zodat de bar chart kloppend is.
 */
export function bucketByDay(events: StampEvent[], days: number): DayBucket[] {
  const map = new Map<string, DayBucket>();

  // Voorvul met lege buckets per dag (van oud naar nieuw)
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const key = dateInAms(d);
    map.set(key, { date: key, stamps: 0, rewards: 0, birthdays: 0 });
  }

  for (const e of events) {
    const key = dateInAms(new Date(e.at));
    const bucket = map.get(key);
    if (!bucket) continue;
    if (e.type === "stamp") bucket.stamps++;
    else if (e.type === "redeem") bucket.rewards++;
    else if (e.type === "birthday") bucket.birthdays++;
  }

  return Array.from(map.values());
}

/**
 * Geef klanten wiens verjaardag binnen de komende `windowDays` valt.
 */
export function computeUpcomingBirthdays(
  customers: Customer[],
  windowDays: number
): UpcomingBirthday[] {
  const today = todayInAms(); // "YYYY-MM-DD"
  const todayYear = parseInt(today.slice(0, 4), 10);
  const todayMD = today.slice(5);

  const result: UpcomingBirthday[] = [];

  for (const c of customers) {
    if (!c.birthday) continue;
    const md = c.birthday.slice(5);

    // Volgende verjaardags-datum: gebruik dit jaar als MD nog niet voorbij is,
    // anders volgend jaar.
    const year = md >= todayMD ? todayYear : todayYear + 1;
    const nextDate = `${year}-${md}`;

    const a = new Date(`${today}T00:00:00Z`);
    const b = new Date(`${nextDate}T00:00:00Z`);
    const daysUntil = Math.round(
      (b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000)
    );

    if (daysUntil >= 0 && daysUntil <= windowDays) {
      result.push({ customer: c, nextDate, daysUntil });
    }
  }

  return result.sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * Geef de 5 meest recente redeems (regular + birthday) — voor de "recent
 * blije klant"-sectie op het dashboard.
 */
export function recentRedeems(
  events: StampEvent[],
  customersById: Map<string, Customer>,
  limit: number
): { customer: Customer; type: "redeem" | "birthday"; at: string }[] {
  return events
    .filter((e) => e.type === "redeem" || e.type === "birthday")
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit)
    .map((e) => ({
      customer: customersById.get(e.customerId)!,
      type: e.type as "redeem" | "birthday",
      at: e.at,
    }))
    .filter((r) => r.customer);
}
