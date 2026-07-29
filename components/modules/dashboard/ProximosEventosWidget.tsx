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
          Ver calendário
        </Button>
      }
    >
      <div className="flex flex-col divide-y divide-cda-border">
        {eventos.length === 0 && (
          <p className="px-5 py-6 text-center text-sm text-cda-text3">Nenhum evento agendado.</p>
        )}
        {eventos.map((evento) => {
          const cor = corCategoria(evento.categoria);
          const dia = evento.data.getUTCDate();
          const mes = MESES[evento.data.getUTCMonth()].slice(0, 3);
          return (
            <div key={evento.id} className="flex items-center gap-3 px-5 py-3">
              <div
                className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg text-[11px] font-semibold leading-none"
                style={{ backgroundColor: cor.bg, color: cor.text }}
              >
                <span className="text-sm">{dia}</span>
                <span className="uppercase">{mes}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-cda-text">{evento.titulo}</p>
                <p className="truncate text-xs text-cda-text3">{evento.categoria}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
