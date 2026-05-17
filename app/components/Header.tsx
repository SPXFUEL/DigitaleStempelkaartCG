import Link from "next/link";
import Image from "next/image";
import { BRAND_NAME } from "@/lib/constants";

export default function Header({ subtitle }: { subtitle?: string }) {
  return (
    <header className="px-5 pt-6 pb-4 flex flex-col items-center text-center">
      <Link href="/" className="inline-flex flex-col items-center gap-1.5">
        <Image
          src="/icons/logo.png"
          alt={BRAND_NAME}
          width={128}
          height={128}
          priority
          className="h-20 w-20 sm:h-24 sm:w-24 object-contain"
        />
        {subtitle && (
          <span
            className="text-xs uppercase tracking-wider"
            style={{ color: "var(--cg-leaf-dark)" }}
          >
            {subtitle}
          </span>
        )}
      </Link>
    </header>
  );
}
