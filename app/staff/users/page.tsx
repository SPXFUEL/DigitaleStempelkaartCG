import { redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/app/components/Header";
import StaffUsersAdmin from "@/app/components/StaffUsersAdmin";
import { getStaffUserId, isStaffAuthenticated } from "@/lib/session";
import { getStaffUser, listStaffUsers } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function StaffUsersPage() {
  if (!(await isStaffAuthenticated())) {
    redirect("/staff/login");
  }

  const users = await listStaffUsers();
  const callerId = await getStaffUserId();
  const caller = callerId ? await getStaffUser(callerId) : null;
  const isBootstrap = users.length === 0;
  const isAdmin = caller?.role === "admin";

  if (!isBootstrap && !isAdmin) {
    return (
      <div className="flex flex-col flex-1">
        <Header subtitle="Accounts" />
        <main className="flex-1 px-5 pb-12 max-w-md w-full mx-auto">
          <section className="cg-card p-6 text-sm">
            <p>
              Alleen admins kunnen accounts beheren. Vraag aan een collega met
              admin-rechten om je een account te geven.
            </p>
            <Link href="/staff" className="inline-block mt-4 underline">
              ← Terug naar scanner
            </Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <Header subtitle="Accounts" />
      <main className="flex-1 px-5 pb-12 max-w-md w-full mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1
            className="text-xl font-semibold tracking-tight"
            style={{ color: "var(--cg-coffee-dark)" }}
          >
            Barista-accounts
          </h1>
          <Link
            href="/staff"
            className="text-xs underline"
            style={{ color: "var(--cg-ink-soft)" }}
          >
            ← Scanner
          </Link>
        </div>
        <StaffUsersAdmin
          users={users.map((u) => ({
            id: u.id,
            name: u.name,
            role: u.role,
            createdAt: u.createdAt,
            lastLoginAt: u.lastLoginAt,
            deactivatedAt: u.deactivatedAt,
          }))}
          callerId={callerId}
          isBootstrap={isBootstrap}
        />
      </main>
    </div>
  );
}
