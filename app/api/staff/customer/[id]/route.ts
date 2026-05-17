import { NextResponse, type NextRequest } from "next/server";
import { getCustomer } from "@/lib/store";
import { isStaffAuthenticated } from "@/lib/session";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/staff/customer/[id]">
) {
  if (!(await isStaffAuthenticated())) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const customer = await getCustomer(id);
  if (!customer) {
    return NextResponse.json({ error: "Klant niet gevonden" }, { status: 404 });
  }
  return NextResponse.json({ customer });
}
