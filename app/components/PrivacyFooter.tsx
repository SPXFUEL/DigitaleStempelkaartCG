import Link from "next/link";
import { BRAND_NAME } from "@/lib/constants";

export default function PrivacyFooter() {
  return (
    <footer
      className="text-center text-[11px] py-6 px-5 mt-auto"
      style={{ color: "var(--cg-ink-soft)" }}
    >
      <p>
        © {new Date().getFullYear()} {BRAND_NAME} ·{" "}
        <Link href="/privacy" className="underline">
          Privacy
        </Link>
      </p>
    </footer>
  );
}
