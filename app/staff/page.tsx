import { redirect } from "next/navigation";
import Header from "@/app/components/Header";
import StaffDashboard from "@/app/components/StaffDashboard";
import { isStaffAuthenticated } from "@/lib/session";
import { listCustomers } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  if (!(await isStaffAuthenticated())) {
    redirect("/staff/login");
  }
  const recent = (await listCustomers()).slice(0, 8);
  return (
    <div className="flex flex-col flex-1">
      <Header subtitle="Barista" />
      <main className="flex-1 px-5 pb-12 max-w-md w-full mx-auto space-y-5">
        <StaffDashboard recent={recent} />
      </main>
    </div>
  );
}
