import { redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/app/components/Header";
import { isStaffAuthenticated } from "@/lib/session";
import { listAudit, listStaffUsers, listCustomers } from "@/lib/store";

export const dynamic = "force-dynamic";

const DUTCH_DTF = new Intl.DateTimeFormat("nl-NL", {
  timeZone: "Europe/Amsterdam",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const ACTION_LABEL: Record<string, string> = {
  stamp: "Stempel",
  stamp_undo: "Stempel teruggedraaid",
  redeem: "Gratis drankje ingewisseld",
  redeem_birthday: "Verjaardags-tractatie",
  customer_create: "Klant aangemaakt",
  customer_delete: "Klant verwijderd",
  staff_login: "Barista ingelogd",
  staff_login_failed: "Mislukte login-poging",
  staff_create: "Account aangemaakt",
  staff_deactivate: "Account uitgeschakeld",
};

export default async function AuditPage() {
  if (!(await isStaffAuthenticated())) {
    redirect("/staff/login");
  }
  const [entries, staffUsers, customers] = await Promise.all([
    listAudit({ limit: 200 }),
    listStaffUsers(),
    listCustomers(),
  ]);

  const staffById = new Map(staffUsers.map((u) => [u.id, u.name]));
  const customerById = new Map(customers.map((c) => [c.id, c.name]));

  return (
    <div className="flex flex-col flex-1">
      <Header subtitle="Audit-log" />
      <main className="flex-1 px-5 pb-12 max-w-md w-full mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1
            className="text-xl font-semibold tracking-tight"
            style={{ color: "var(--cg-coffee-dark)" }}
          >
            Audit-log
          </h1>
          <Link
            href="/staff/inzicht"
            className="text-xs underline"
            style={{ color: "var(--cg-ink-soft)" }}
          >
            ← Dashboard
          </Link>
        </div>
        <p className="text-xs" style={{ color: "var(--cg-ink-soft)" }}>
          Laatste 200 acties. Voor langere historie: SQL Editor in Supabase →{" "}
          <code>select * from audit_log order by at desc</code>.
        </p>

        <section
          className="cg-card divide-y"
          style={{ borderColor: "var(--cg-line)" }}
        >
          {entries.length === 0 ? (
            <p className="p-5 text-sm" style={{ color: "var(--cg-ink-soft)" }}>
              Nog geen acties gelogd.
            </p>
          ) : (
            entries.map((e, i) => (
              <div key={e.id ?? `${e.at}-${i}`} className="p-4 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className="font-medium"
                    style={{ color: "var(--cg-coffee-dark)" }}
                  >
                    {ACTION_LABEL[e.action] ?? e.action}
                  </span>
                  <span
                    className="text-[11px] font-mono"
                    style={{ color: "var(--cg-ink-soft)" }}
                  >
                    {DUTCH_DTF.format(new Date(e.at))}
                  </span>
                </div>
                <div
                  className="text-xs mt-1 space-y-0.5"
                  style={{ color: "var(--cg-ink-soft)" }}
                >
                  {e.customerId && (
                    <div>
                      Klant:{" "}
                      <span style={{ color: "var(--cg-ink)" }}>
                        {customerById.get(e.customerId) ??
                          e.customerId.slice(0, 8)}
                      </span>
                    </div>
                  )}
                  {e.staffUserId ? (
                    <div>
                      Barista:{" "}
                      <span style={{ color: "var(--cg-ink)" }}>
                        {staffById.get(e.staffUserId) ??
                          e.staffUserId.slice(0, 8)}
                      </span>
                    </div>
                  ) : (
                    e.action.startsWith("staff_") && (
                      <div>Barista: (legacy PIN — geen account)</div>
                    )
                  )}
                  {e.ip && <div>IP: {e.ip}</div>}
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
