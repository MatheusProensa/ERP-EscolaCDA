import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { corCategoria, MESES } from "@/lib/calendario";
import { hojeBrasilia } from "@/lib/utils";

export async function ProximosEventosWidget() {
  // hojeBrasilia() (não new Date()) — o servidor roda em UTC, e usar a data
  // "agora" direto excluía os eventos de HOJE da lista entre 21h e meia-noite
  // no horário de Brasília (o corte ficava marcado como amanhã).
  const inicioHoje = hojeBrasilia();

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
        <Link href="/calendario" className="text-sm font-medium text-cda-blue hover:underline">
          Ver tudo
        </Link>
      }
    >
      <div className="flex flex-col divide-y divide-cda-border">
        {eventos.length === 0 && <EmptyState title="Nenhum evento agendado." />}
        {eventos.map((evento) => {
          const cor = corCategoria(evento.categoria);
          const dia = evento.data.getUTCDate();
          const mes = MESES[evento.data.getUTCMonth()].slice(0, 3);
          return (
            <div key={evento.id} className="flex flex-wrap items-center gap-x-2.5 gap-y-1 px-4 py-2.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: cor.dot }} />
              <span className="shrink-0 text-xs font-semibold uppercase tabular-nums text-cda-text3">
                {dia} {mes}
              </span>
              <p className="min-w-0 flex-1 truncate text-sm text-cda-text">{evento.titulo}</p>
              {/* NOVO: só a tela de Calendário tinha a legenda de cor — quem só olha o
                  Dashboard não tinha como saber o que cada cor significa. */}
              <span
                className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight"
                style={{ backgroundColor: cor.bg, color: cor.text }}
              >
                {evento.categoria}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
