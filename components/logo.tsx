import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5 font-semibold">
      <span className="grid size-8 place-items-center rounded-full bg-foreground text-background">
        <span className="size-2.5 rounded-full bg-[var(--signal)]" />
      </span>
      {!compact && <span className="tracking-[-0.03em]">loopthing</span>}
    </Link>
  );
}
