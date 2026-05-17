import { redirect } from "next/navigation";
import Header from "@/app/components/Header";
import StaffLoginForm from "@/app/components/StaffLoginForm";
import { isStaffAuthenticated } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function StaffLoginPage() {
  if (await isStaffAuthenticated()) {
    redirect("/staff");
  }
  return (
    <div className="flex flex-col flex-1">
      <Header subtitle="Barista-login" />
      <main className="flex-1 px-5 pb-12 max-w-md w-full mx-auto space-y-5">
        <section className="cg-card p-6">
          <h1
            className="text-xl font-semibold tracking-tight"
            style={{ color: "var(--cg-coffee-dark)" }}
          >
            Barista-login
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--cg-ink-soft)" }}>
            Voer de PIN in om stempels te kunnen zetten.
          </p>
          <div className="mt-4">
            <StaffLoginForm />
          </div>
        </section>
      </main>
    </div>
  );
}
