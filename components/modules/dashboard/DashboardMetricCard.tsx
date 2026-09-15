import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";

/** Card de métrica do topo do Dashboard — pedido do dono, mockup de
 * referência: borda superior colorida de 4px + ícone, diferente do
 * <MetricCard> compartilhado (círculo com ícone, sem borda) que o resto do
 * sistema usa. Criado à parte pra não mudar a aparência de todo lugar que
 * usa MetricCard (Área Pedagógica, Cardápio etc.) só por causa do Dashboard. */
export function DashboardMetricCard({
  icon: Icon,
  cor,
  value,
  label,
  subtext,
  href,
}: {
  icon: LucideIcon;
  /** Token CSS, ex.: "var(--cda-blue)" — cor da borda de cima e do ícone. */
  cor: string;
  value: React.ReactNode;
  label: string;
  subtext?: string;
  href?: string;
}) {
  return (
    <Card href={href} className="p-4" style={{ borderTopWidth: 4, borderTopColor: cor }}>
      <Icon className="mb-2 h-5 w-5" style={{ color: cor }} />
      <div className="text-2xl font-bold text-cda-text">{value}</div>
      <div className="text-sm text-cda-text2">{label}</div>
      {subtext && <div className="mt-0.5 text-xs text-cda-text3">{subtext}</div>}
    </Card>
  );
}
