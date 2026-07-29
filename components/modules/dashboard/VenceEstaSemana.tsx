import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export type ItemVencimento = {
  id: string;
  titulo: string;
  detalhe: string;
  data: Date;
  href?: string;
};

/** Dias restantes até `data` (0 = hoje, negativo já não deveria aparecer aqui). */
function diasRestantes(data: Date): number {
  const hoje = new Date();
  const diff = Math.floor((data.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export function VenceEstaSemana({ itens }: { itens: ItemVencimento[] }) {
  const ordenados = [...itens].sort((a, b) => a.data.getTime() - b.data.getTime());

  return (
    <Card
      // NOVO: ícone no título (consistência com os outros cards do dashboard)
      title={
        <span className="flex items-center gap-2">
          <CalendarClock className="h-[15px] w-[15px] text-cda-blue" />
          Vence esta semana
        </span>
      }
      // NOVO: contagem no cabeçalho, como nos outros cards com listas
      action={<Badge variant="gray">{ordenados.length}</Badge>}
      className="h-fit"
    >
      <div className="flex flex-col divide-y divide-cda-border">
        {ordenados.length === 0 && (
          <p className="px-5 py-6 text-center text-sm text-cda-text3">Nada vencendo nos próximos 7 dias.</p>
        )}
        {ordenados.map((item) => {
          const dias = diasRestantes(item.data);
          const conteudo = (
            <div className="flex items-center gap-3 px-5 py-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cda-blue/10">
                <CalendarClock className="h-3.5 w-3.5 text-cda-blue" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-cda-text">{item.titulo}</p>
                <p className="truncate text-xs text-cda-text3">{item.detalhe}</p>
              </div>
              {/* NOVO: badge de urgência (vermelho ≤3 dias, âmbar acima) em vez de
                  texto solto "vence em Xd" */}
              <Badge variant={dias <= 3 ? "red" : "amber"} className="shrink-0">
                {dias}d
              </Badge>
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
