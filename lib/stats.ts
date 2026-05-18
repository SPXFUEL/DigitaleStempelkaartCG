import { ASSUMED_DRINK_PRICE } from "./constants";
import type { Customer, StampEvent } from "./types";

export interface CustomerStats {
  daysAsMember: number;
  totalDrinks: number;
  totalRewards: number;
  savedEur: number;
  /** Aantal aaneengesloten weken met een bezoek, inclusief "deze week" of "vorige week" */
  weekStreak: number;
  /** Naam van de dag waarop deze klant het vaakst langs komt, of null bij < 5 bezoeken */
  favoriteDay: string | null;
  /** ISO-timestamp van het laatste event */
  lastVisitAt: string | null;
}

/**
 * Geeft de Maandag-datum (YYYY-MM-DD) van de week waar deze datum in valt.
 */
function weekKey(d: Date): string {
  const dt = new Date(d);
  const day = dt.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  dt.setHours(0, 0, 0, 0);
  return dt.toISOString().slice(0, 10);
}

function calcWeekStreak(events: StampEvent[]): number {
  if (events.length === 0) return 0;
  const weeks = new Set<string>();
  for (const e of events) weeks.add(weekKey(new Date(e.at)));

  const cursor = new Date();
  let streak = 0;

  // Sta toe dat de huidige week leeg is — pak dan vorige week als startpunt
  if (!weeks.has(weekKey(cursor))) {
    cursor.setDate(cursor.getDate() - 7);
    if (!weeks.has(weekKey(cursor))) return 0;
  }

  while (weeks.has(weekKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

const DUTCH_DAYS = [
  "zondag",
  "maandag",
  "dinsdag",
  "woensdag",
  "donderdag",
  "vrijdag",
  "zaterdag",
];

function calcFavoriteDay(events: StampEvent[]): string | null {
  if (events.length < 5) return null;
  const counts = new Array(7).fill(0);
  for (const e of events) {
    counts[new Date(e.at).getDay()]++;
  }
  let maxIdx = 0;
  for (let i = 1; i < 7; i++) {
    if (counts[i] > counts[maxIdx]) maxIdx = i;
  }
  return DUTCH_DAYS[maxIdx];
}

export function computeStats(
  customer: Customer,
  events: StampEvent[]
): CustomerStats {
  const created = new Date(customer.createdAt);
  const now = new Date();
  const daysAsMember = Math.max(
    0,
    Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
  );

  const lastEvent = events.length > 0 ? events[events.length - 1] : null;

  return {
    daysAsMember,
    totalDrinks: customer.totalDrinks,
    totalRewards: customer.totalRewards,
    savedEur: customer.totalRewards * ASSUMED_DRINK_PRICE,
    weekStreak: calcWeekStreak(events),
    favoriteDay: calcFavoriteDay(events),
    lastVisitAt: lastEvent?.at ?? null,
  };
}
