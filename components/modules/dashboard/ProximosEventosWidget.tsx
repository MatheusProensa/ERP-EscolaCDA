import { CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { corCategoria, MESES } from "@/lib/calendario";

export async function ProximosEventosWidget() {
  const hoje = new Date();
  const inicioHoje = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()));

  const eventos = await prisma.eventoCalendario.findMany({
    where: { data: { gte: inicioHoje } },
    orderBy: { data: "asc" },
    take: 5,
  });

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <CalendarDays className="h-[15px] w-[15px] text-cda-blue" />
          Próximos eventos
        </span>
      }
      action={
        <Button href="/calendario" variant="outline" size="sm">
          Ver tudo
        </Button>
      }
    >
      <div className="flex flex-col divide-y divide-cda-border">
        {eventos.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-cda-text3">Nenhum evento agendado.</p>
        )}
        {eventos.map((evento) => {
          const cor = corCategoria(evento.categoria);
          const dia = evento.data.getUTCDate();
          const mes = MESES[evento.data.getUTCMonth()].slice(0, 3);
          return (
            <div key={evento.id} className="flex items-center gap-2.5 px-4 py-2.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: cor.dot }} />
              <span className="shrink-0 text-xs font-semibold uppercase tabular-nums text-cda-text3">
                {dia} {mes}
              </span>
              <p className="min-w-0 flex-1 truncate text-sm text-cda-text">{evento.titulo}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
