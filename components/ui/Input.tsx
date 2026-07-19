import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: React.ReactNode;
  error?: string;
  icon?: React.ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-cda-text2">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cda-text3">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "h-10 w-full rounded-lg border bg-white px-3 text-sm text-cda-text placeholder:text-cda-text3 outline-none transition-colors focus:border-cda-blue",
              !!icon && "pl-9",
              error ? "border-cda-red" : "border-cda-border",
              className
            )}
            {...props}
          />
        </div>
        {error && <span className="text-xs text-cda-red">{error}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
