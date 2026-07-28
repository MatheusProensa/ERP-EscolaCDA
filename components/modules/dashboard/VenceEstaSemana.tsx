import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatarData } from "@/lib/utils";

export type ItemVencimento = {
  id: string;
  titulo: string;
  detalhe: string;
  data: Date;
  href?: string;
};

export function VenceEstaSemana({ itens }: { itens: ItemVencimento[] }) {
  const ordenados = [...itens].sort((a, b) => a.data.getTime() - b.data.getTime());

  return (
    <Card title="Vence essa semana" className="h-fit">
      <div className="flex flex-col divide-y divide-cda-border">
        {ordenados.length === 0 && (
          <p className="px-5 py-6 text-center text-sm text-cda-text3">Nada vencendo nos próximos 7 dias.</p>
        )}
        {ordenados.map((item) => {
          const conteudo = (
            <div className="flex items-start gap-3 px-5 py-3">
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-cda-amber" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-cda-text">{item.titulo}</p>
                <p className="text-xs text-cda-text3">{item.detalhe}</p>
              </div>
              <span className="shrink-0 text-xs text-cda-text3">{formatarData(item.data)}</span>
            </div>
          );
          return item.href ? (
            <Link key={item.id} href={item.href} className="hover:bg-cda-bg">
              {conteudo}
            </Link>
          ) : (
            <div key={item.id}>{conteudo}</div>
          );
        })}
      </div>
    </Card>
  );
}
