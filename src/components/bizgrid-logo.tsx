import Image from "next/image";
import { cn } from "@/lib/utils";

type BizgridLogoProps = {
  size?: number;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  className?: string;
};

export function BizgridLogo({
  size = 32,
  showWordmark = false,
  wordmarkClassName,
  className,
}: BizgridLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src="/bizgridlogo.png"
        alt="Bizgrid"
        width={size}
        height={size}
        className="shrink-0 rounded-lg"
        priority
      />
      {showWordmark ? (
        <span className={cn("font-display font-bold tracking-tight", wordmarkClassName)}>
          Bizgrid
        </span>
      ) : null}
    </span>
  );
}
