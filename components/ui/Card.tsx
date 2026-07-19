import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  title,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[10px] border border-cda-border bg-cda-surface",
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-cda-border px-5 py-4">
          {title && <h3 className="text-sm font-semibold text-cda-text">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
