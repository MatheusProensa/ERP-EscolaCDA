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

export type MetricTone =
  | "neutral"
  | "success"
  | "warning"
  | "critical"
  | "danger"
  | "cat1"
  | "cat2"
  | "cat3"
  | "cat4"
  | "cat5"
  | "cat6";

// NOVO (handoff de design, etapa 2.1): antes cada card recebia uma cor decorativa
// por posição na grade (1º azul, 2º âmbar...) sem relação com o dado — e coincidia
// com as cores que já significam "ok"/"problema" nos badges. Agora status (verde/
// âmbar/vermelho) só aparece quando descreve de verdade um estado. As cores cat1-6
// são categóricas (mesma paleta do Badge/avatares) — dão personalidade de volta pra
// cards que não representam estado nenhum, sem reintroduzir a confusão com "ok/problema".
const TONE_COLOR: Record<MetricTone, string> = {
  neutral: "var(--icon-neutral)",
  success: "var(--status-success)",
  warning: "var(--status-warning)",
  critical: "var(--status-critical)",
  danger: "var(--status-danger)",
  cat1: "var(--cat-1-dot)",
  cat2: "var(--cat-2-dot)",
  cat3: "var(--cat-3-dot)",
  cat4: "var(--cat-4-dot)",
  cat5: "var(--cat-5-dot)",
  cat6: "var(--cat-6-dot)",
};

export function MetricCard({
  icon: Icon,
  tone = "neutral",
  value,
  label,
  subtext,
  badge,
  badgeVariant = "gray",
  trend,
  href,
}: {
  icon: LucideIcon;
  tone?: MetricTone;
  value: React.ReactNode;
  label: string;
  subtext?: string;
  badge?: string;
  badgeVariant?: BadgeVariant;
  /** NOVO: até ~7 pontos para desenhar um sparkline sob o valor. */
  trend?: number[];
  /** Card inteiro vira link — ex.: "Contratos pendentes" leva direto pra
   * lista já filtrada, em vez de só informar o número. */
  href?: string;
}) {
  const cor = TONE_COLOR[tone];
  return (
    // Celular: linha compacta (ícone pequeno + texto do lado) — a versão empilhada
    // e centralizada (computador, a partir do sm:) tomava quase a tela toda com 4
    // cards, empurrando a lista de verdade pra baixo da dobra (achado do dono,
    // set/2026, olhando o Avaliação Nutricional no próprio celular). Subtexto e
    // sparkline somem no celular — não cabem legíveis nesse formato mais estreito,
    // e o rótulo já basta pra bater o olho; os dois continuam no computador.
    <Card
      href={href}
      className="group relative flex items-center gap-3 p-3 transition-[transform,border-color,box-shadow] duration-500 ease-out sm:flex-col sm:gap-0 sm:p-5 sm:text-center hover:sm:scale-[1.015] hover:[border-color:var(--metric-border)] hover:shadow-[0_4px_16px_-4px_var(--metric-border)]"
      style={{ ["--metric-border" as string]: `color-mix(in oklch, ${cor} 45%, transparent)` }}
    >
      {/* NOVO: badge agora é um selinho encostado no canto do círculo do ícone
          (position: absolute), em vez de ficar ao lado — assim o ícone continua
          sempre centralizado, com ou sem badge. */}
      {badge && (
        <Badge variant={badgeVariant} className="absolute -right-2 -top-2 whitespace-nowrap">
          {badge}
        </Badge>
      )}
      <div className="relative shrink-0 sm:mb-4">
        {/* NOVO: chip circular com anel + sombra suave na cor do tom, em vez do
            quadrado com tinta chapada — visual mais rico/"premium". */}
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full border transition-transform duration-500 ease-out group-hover:scale-110 sm:h-12 sm:w-12"
          style={{
            backgroundColor: `color-mix(in oklch, ${cor} 14%, white)`,
            borderColor: `color-mix(in oklch, ${cor} 22%, transparent)`,
            boxShadow: `0 2px 8px color-mix(in oklch, ${cor} 18%, transparent)`,
          }}
        >
          <Icon className="h-[18px] w-[18px] sm:h-[22px] sm:w-[22px]" style={{ color: cor }} strokeWidth={2.25} />
        </div>
      </div>
      <div className="min-w-0 flex-1 sm:flex-none">
        <div className="text-lg font-bold text-cda-text sm:text-2xl">{value}</div>
        <div className="text-xs leading-tight text-cda-text2 sm:mt-1 sm:text-sm sm:leading-normal">{label}</div>
        {subtext && <div className="hidden text-xs text-cda-text3 sm:mt-0.5 sm:block">{subtext}</div>}
      </div>
      {trend && (
        <div className="hidden sm:mt-3 sm:block sm:w-full">
          <Sparkline points={trend} color={cor} />
        </div>
      )}
    </Card>
  );
}
