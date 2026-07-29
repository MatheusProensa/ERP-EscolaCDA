import type { LucideIcon } from "lucide-react";
import { Card } from "./Card";
import { Badge, type BadgeVariant } from "./Badge";

/** NOVO: sparkline decorativo opcional — tendência dos últimos pontos, sem eixo/legenda. */
function Sparkline({ points, color }: { points: number[]; color: string }) {
  if (!points || points.length < 2) return null;
  const w = 100;
  const h = 24;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const d = points
    .map((p, i) => `${(i / (points.length - 1)) * w},${h - ((p - min) / range) * h}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" className="block">
      <polyline points={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  );
}

export function MetricCard({
  icon: Icon,
  iconColor = "#1A6FD8",
  value,
  label,
  subtext,
  badge,
  badgeVariant = "gray",
  trend,
}: {
  icon: LucideIcon;
  iconColor?: string;
  value: React.ReactNode;
  label: string;
  subtext?: string;
  badge?: string;
  badgeVariant?: BadgeVariant;
  /** NOVO: até ~7 pontos para desenhar um sparkline sob o valor. */
  trend?: number[];
}) {
  return (
    <Card className="group relative flex flex-col items-center p-5 text-center transition-transform hover:scale-[1.02]">
      {/* NOVO: badge agora é um selinho encostado no canto do círculo do ícone
          (position: absolute), em vez de ficar ao lado — assim o ícone continua
          sempre centralizado, com ou sem badge. */}
      {badge && (
        <Badge variant={badgeVariant} className="absolute -right-2 -top-2 whitespace-nowrap">
          {badge}
        </Badge>
      )}
      <div className="relative mb-4">
        {/* NOVO: chip circular com anel + sombra suave na cor do ícone, em vez do
            quadrado com tinta chapada — visual mais rico/"premium". */}
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full border transition-transform group-hover:scale-110"
          style={{
            backgroundColor: `color-mix(in oklch, ${iconColor} 14%, white)`,
            borderColor: `color-mix(in oklch, ${iconColor} 22%, transparent)`,
            boxShadow: `0 2px 8px color-mix(in oklch, ${iconColor} 18%, transparent)`,
          }}
        >
          <Icon className="h-[22px] w-[22px]" style={{ color: iconColor }} strokeWidth={2.25} />
        </div>
      </div>
      <div className="text-2xl font-bold text-cda-text">{value}</div>
      <div className="mt-1 text-sm text-cda-text2">{label}</div>
      {subtext && <div className="mt-0.5 text-xs text-cda-text3">{subtext}</div>}
      {trend && (
        <div className="mt-3 w-full">
          <Sparkline points={trend} color={iconColor} />
        </div>
      )}
    </Card>
  );
}
