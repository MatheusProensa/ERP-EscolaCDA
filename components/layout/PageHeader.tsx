import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  breadcrumb,
  action,
}: {
  title: string;
  subtitle?: string;
  breadcrumb?: { label: string; href?: string }[];
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        {breadcrumb && breadcrumb.length > 0 && (
          <div className="mb-1 flex items-center gap-1 text-xs text-cda-text3">
            {breadcrumb.map((item, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                {item.href ? (
                  <Link href={item.href} className="hover:text-cda-blue">
                    {item.label}
                  </Link>
                ) : (
                  <span>{item.label}</span>
                )}
              </span>
            ))}
          </div>
        )}
        <h1 className="text-xl font-bold text-cda-text">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-cda-text2">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
