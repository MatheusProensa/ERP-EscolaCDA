import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { CardapioDiaCard } from "@/components/modules/cardapio/CardapioDiaCard";

function inicioDaSemana(data: Date): Date {
  const d = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()));
  const diaSemana = d.getUTCDay();
  const diff = diaSemana === 0 ? -6 : 1 - diaSemana; // volta pra segunda-feira
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

export default async function CardapioPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>;
}) {
  const { semana } = await searchParams;
  const referencia = semana ? new Date(`${semana}T00:00:00Z`) : new Date();
  const segunda = inicioDaSemana(referencia);

  const dias = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(segunda);
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });

  const sexta = dias[4];
  const cardapios = await prisma.cardapio.findMany({
    where: { data: { gte: segunda, lte: sexta } },
  });
  const porData = new Map(cardapios.map((c) => [c.data.toISOString().slice(0, 10), c]));

  const semanaAnterior = new Date(segunda);
  semanaAnterior.setUTCDate(semanaAnterior.getUTCDate() - 7);
  const semanaSeguinte = new Date(segunda);
  semanaSeguinte.setUTCDate(semanaSeguinte.getUTCDate() + 7);

  return (
    <div>
      <PageHeader
        title="Cardápio"
        subtitle={`Semana de ${segunda.toLocaleDateString("pt-BR", { timeZone: "UTC" })} a ${sexta.toLocaleDateString("pt-BR", { timeZone: "UTC" })}`}
        action={
          <div className="flex gap-2">
            <Link
              href={`/cardapio?semana=${semanaAnterior.toISOString().slice(0, 10)}`}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-cda-border bg-white text-cda-text hover:bg-cda-bg"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link
              href={`/cardapio?semana=${semanaSeguinte.toISOString().slice(0, 10)}`}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-cda-border bg-white text-cda-text hover:bg-cda-bg"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {dias.map((dia) => (
          <CardapioDiaCard key={dia.toISOString()} data={dia} cardapio={porData.get(dia.toISOString().slice(0, 10)) ?? null} />
        ))}
      </div>
    </div>
  );
}
