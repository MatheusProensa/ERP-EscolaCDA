import { cn } from "@/lib/utils";

export type BadgeVariant = "green" | "red" | "amber" | "blue" | "purple" | "gray";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  green: "bg-cda-green/10 text-cda-green",
  red: "bg-cda-red/10 text-cda-red",
  amber: "bg-cda-amber/10 text-cda-amber",
  blue: "bg-cda-blue/10 text-cda-blue",
  purple: "bg-purple-500/10 text-purple-600",
  gray: "bg-cda-text3/15 text-cda-text2",
};

export function Badge({
  children,
  variant = "gray",
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
