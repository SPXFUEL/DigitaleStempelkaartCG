import { redirect } from "next/navigation";
import { getCustomerCookie } from "@/lib/session";
import { getCustomer } from "@/lib/store";

export default async function Home() {
  const id = await getCustomerCookie();
  if (id) {
    const customer = await getCustomer(id);
    if (customer) {
      redirect("/profiel");
    }
  }
  redirect("/welkom");
}
