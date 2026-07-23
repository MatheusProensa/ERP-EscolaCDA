"use client";

import { cn } from "@/lib/utils";

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-cda-border bg-cda-bg p-0.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors",
              active ? "bg-white text-cda-text shadow-sm" : "text-cda-text3 hover:text-cda-text2"
            )}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span className={cn("text-[11px]", active ? "text-cda-text2" : "text-cda-text3")}>{opt.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
