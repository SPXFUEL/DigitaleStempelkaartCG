import { redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/app/components/Header";
import KpiGrid from "@/app/components/dashboard/KpiGrid";
import ActivityChart from "@/app/components/dashboard/ActivityChart";
import TopCustomers from "@/app/components/dashboard/TopCustomers";
import UpcomingBirthdaysList from "@/app/components/dashboard/UpcomingBirthdaysList";
import RecentRedeems from "@/app/components/dashboard/RecentRedeems";
import { isStaffAuthenticated } from "@/lib/session";
import {
  countCustomers,
  listAllEvents,
  listCustomers,
  listCustomersWithBirthday,
  listTopCustomers,
} from "@/lib/store";
import {
  bucketByDay,
  computeKpis,
  computeUpcomingBirthdays,
  recentRedeems,
} from "@/lib/dashboard";

export const dynamic = "force-dynamic";

const ACTIVITY_DAYS = 14;
const BIRTHDAY_WINDOW_DAYS = 7;

export default async function InzichtPage() {
  if (!(await isStaffAuthenticated())) {
    redirect("/staff/login");
  }

  // 30 dagen terug voor KPI's en daily buckets
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [total, allEvents, all, top, withBirthday] = await Promise.all([
    countCustomers(),
    listAllEvents(since30),
    listCustomers(),
    listTopCustomers(10),
    listCustomersWithBirthday(),
  ]);

  const kpis = computeKpis(total, allEvents, all);
  const buckets = bucketByDay(allEvents, ACTIVITY_DAYS);
  const upcoming = computeUpcomingBirthdays(withBirthday, BIRTHDAY_WINDOW_DAYS);

  const customerById = new Map(all.map((c) => [c.id, c]));
  const recent = recentRedeems(allEvents, customerById, 5);

  return (
    <div className="flex flex-col flex-1">
      <Header subtitle="Inzicht" />
      <main className="flex-1 px-5 pb-12 max-w-md w-full mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1
            className="text-xl font-semibold tracking-tight"
            style={{ color: "var(--cg-coffee-dark)" }}
          >
            Coffee Garden dashboard
          </h1>
          <Link
            href="/staff"
            className="text-xs underline"
            style={{ color: "var(--cg-ink-soft)" }}
          >
            ← Scanner
          </Link>
        </div>

        <KpiGrid kpis={kpis} />

        <ActivityChart buckets={buckets} />

        <UpcomingBirthdaysList items={upcoming} />

        <TopCustomers customers={top} />

        <RecentRedeems items={recent} />

        <p
          className="text-center text-[11px] pt-2"
          style={{ color: "var(--cg-ink-soft)" }}
        >
          Cijfers worden bij elke pageview opnieuw berekend uit Supabase.
        </p>
      </main>
    </div>
  );
}
