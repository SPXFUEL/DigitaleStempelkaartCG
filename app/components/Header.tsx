import Link from "next/link";
import { BRAND_NAME } from "@/lib/constants";

export default function Header({ subtitle }: { subtitle?: string }) {
  return (
    <header className="px-5 pt-8 pb-4">
      <Link href="/" className="inline-flex items-center gap-2.5">
        <span
          aria-hidden
          className="inline-flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "var(--cg-coffee)" }}
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 8h1a4 4 0 0 1 0 8h-1" />
            <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
            <path d="M6 2v3M10 2v3M14 2v3" />
          </svg>
        </span>
        <span className="flex flex-col leading-tight">
          <span
            className="text-lg font-semibold tracking-tight"
            style={{ color: "var(--cg-coffee-dark)" }}
          >
            {BRAND_NAME}
          </span>
          {subtitle && (
            <span className="text-xs" style={{ color: "var(--cg-ink-soft)" }}>
              {subtitle}
            </span>
          )}
        </span>
      </Link>
    </header>
  );
}
