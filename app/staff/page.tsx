import { redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/app/components/Header";
import StaffDashboard from "@/app/components/StaffDashboard";
import { getStaffUserId, isStaffAuthenticated } from "@/lib/session";
import { getStaffUser, listCustomers } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  if (!(await isStaffAuthenticated())) {
    redirect("/staff/login");
  }
  const callerId = await getStaffUserId();
  const caller = callerId ? await getStaffUser(callerId) : null;
  const recent = (await listCustomers()).slice(0, 8);
  return (
    <div className="flex flex-col flex-1">
      <Header subtitle="Barista" />
      <main className="flex-1 px-5 pb-12 max-w-md w-full mx-auto space-y-5">
        <div
          className="flex items-center justify-end gap-4 text-sm font-medium"
          style={{ color: "var(--cg-coffee-dark)" }}
        >
          <Link href="/staff/inzicht" className="underline">
            📊 Dashboard
          </Link>
          <Link href="/staff/users" className="underline">
            👥 Accounts
          </Link>
        </div>
        <StaffDashboard recent={recent} staffName={caller?.name} />
      </main>
    </div>
  );
}
