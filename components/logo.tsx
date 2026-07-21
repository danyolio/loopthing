import Image from "next/image";
import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Loopthing home"
      className="inline-flex shrink-0 items-center"
    >
      <Image
        src={compact ? "/logo-mark.svg" : "/logo.svg"}
        alt=""
        width={compact ? 30 : 124}
        height={30}
        unoptimized
      />
    </Link>
  );
}
