import Link from "next/link";
import { BookOpen, CheckCircle2, Clock3, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";

/** Card novo do Dashboard (pedido do dono, mockup de referência) — resumo da
 * entrega pedagógica do mês: soma de Planejamento/Roteiro/Atividade
 * Gráfica/Tema Literário aprovados em TODAS as turmas (mesma regra já usada
 * na Fila de Impressão — ver app/(erp)/impressao/page.tsx), calculado em
 * DashboardAdmin.tsx e passado pronto aqui (puramente visual). */
export function PedagogicoResumoWidget({
  mesLabel,
  entregues,
  total,
  turmasCompletas,
  turmasAndamento,
  turmasAtrasadas,
}: {
  mesLabel: string;
  entregues: number;
  total: number;
  turmasCompletas: number;
  turmasAndamento: number;
  turmasAtrasadas: number;
}) {
  const pct = total > 0 ? Math.round((entregues / total) * 100) : 0;

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <BookOpen className="h-[15px] w-[15px] text-cda-blue" />
          Pedagógico · {mesLabel}
        </span>
      }
      action={<span className="text-sm font-semibold text-cda-text2">{pct}%</span>}
    >
      <div className="flex flex-col gap-4 p-4">
        <div>
          <p className="mb-1.5 text-xs text-cda-text3">
            {entregues} de {total} documentos entregues
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-cda-bg">
            <div className="h-full rounded-full bg-cda-blue" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <span className="flex items-center gap-2 text-cda-text2">
            <CheckCircle2 className="h-3.5 w-3.5 text-cda-green" />
            {turmasCompletas} turma{turmasCompletas === 1 ? "" : "s"} completa{turmasCompletas === 1 ? "" : "s"}
          </span>
          <span className="flex items-center gap-2 text-cda-text2">
            <Clock3 className="h-3.5 w-3.5 text-cda-amber" />
            {turmasAndamento} em andamento
          </span>
          <span className="flex items-center gap-2 text-cda-text2">
            <TriangleAlert className="h-3.5 w-3.5 text-cda-red" />
            {turmasAtrasadas} atrasada{turmasAtrasadas === 1 ? "" : "s"}
          </span>
        </div>

        <Link href="/impressao" className="text-sm font-medium text-cda-blue hover:underline">
          Ver fila de impressão →
        </Link>
      </div>
    </Card>
  );
}
