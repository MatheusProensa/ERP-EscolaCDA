import type { LucideIcon } from "lucide-react";
import { Card } from "./Card";
import { Badge, type BadgeVariant } from "./Badge";

export function MetricCard({
  icon: Icon,
  iconColor = "#1A6FD8",
  value,
  label,
  subtext,
  badge,
  badgeVariant = "gray",
}: {
  icon: LucideIcon;
  iconColor?: string;
  value: React.ReactNode;
  label: string;
  subtext?: string;
  badge?: string;
  badgeVariant?: BadgeVariant;
}) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${iconColor}1A` }}
        >
          <Icon className="h-5 w-5" style={{ color: iconColor }} />
        </div>
        {badge && <Badge variant={badgeVariant}>{badge}</Badge>}
      </div>
      <div className="text-2xl font-bold text-cda-text">{value}</div>
      <div className="mt-1 text-sm text-cda-text2">{label}</div>
      {subtext && <div className="mt-0.5 text-xs text-cda-text3">{subtext}</div>}
    </Card>
  );
}
