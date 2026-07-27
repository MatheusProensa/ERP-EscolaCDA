import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import {
  CATEGORIAS_EVENTO,
  DIAS_SEMANA_ABREV,
  MESES,
  corCategoria,
  gerarGradeMes,
  mesmaData,
} from "@/lib/calendario";

export async function CalendarioWidget() {
  const hoje = new Date();
  const ano = hoje.getUTCFullYear();
  const mes = hoje.getUTCMonth() + 1;

  const grade = gerarGradeMes(ano, mes);
  const inicio = grade[0].data;
  const fim = new Date(grade[41].data);
  fim.setUTCDate(fim.getUTCDate() + 1);

  const eventos = await prisma.eventoCalendario.findMany({
    where: { data: { gte: inicio, lt: fim } },
    orderBy: { data: "asc" },
  });

  const eventosPorDia = new Map<string, typeof eventos>();
  for (const e of eventos) {
    const chave = e.data.toISOString().slice(0, 10);
    const lista = eventosPorDia.get(chave) ?? [];
    lista.push(e);
    eventosPorDia.set(chave, lista);
  }

  return (
    <Card className="flex flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-cda-text">
          <CalendarDays className="h-4 w-4 text-cda-blue" />
          Calendário — {MESES[mes - 1]}/{ano}
        </h3>
        <Link href="/calendario" className="text-xs font-medium text-cda-blue hover:underline">
          Ver completo
        </Link>
      </div>

      <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1.5">
        {CATEGORIAS_EVENTO.map((cat) => {
          const cor = corCategoria(cat);
          return (
            <div key={cat} className="flex items-center gap-1.5 text-[11px] text-cda-text2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cor.dot }} />
              {cat}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-cda-border bg-cda-border text-[10px]">
        {DIAS_SEMANA_ABREV.map((d) => (
          <div key={d} className="bg-cda-bg py-1.5 text-center font-semibold uppercase text-cda-text3">
            {d}
          </div>
        ))}
        {grade.map(({ data, doMesAtual }, i) => {
          const chave = data.toISOString().slice(0, 10);
          const eventosDoDia = eventosPorDia.get(chave) ?? [];
          const ehHoje = mesmaData(data, hoje);
          return (
            <div key={i} className={`min-h-[64px] bg-white p-1 ${!doMesAtual ? "bg-cda-bg/60" : ""}`}>
              <span
                className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                  ehHoje
                    ? "bg-cda-blue font-bold text-white"
                    : doMesAtual
                      ? "text-cda-text2"
                      : "text-cda-text3"
                }`}
              >
                {data.getUTCDate()}
              </span>
              <div className="mt-0.5 flex flex-col gap-0.5">
                {eventosDoDia.slice(0, 2).map((e) => {
                  const cor = corCategoria(e.categoria);
                  return (
                    <span
                      key={e.id}
                      title={e.titulo}
                      className="truncate rounded px-1 py-0.5 text-[9px] leading-tight"
                      style={{ backgroundColor: cor.bg, color: cor.text }}
                    >
                      {e.titulo}
                    </span>
                  );
                })}
                {eventosDoDia.length > 2 && (
                  <span className="text-[9px] text-cda-text3">+{eventosDoDia.length - 2}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
