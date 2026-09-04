import { Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { EscalaBlocoCard } from "@/components/modules/horarios-equipe/EscalaBlocoCard";
import type { ItemEscalaBloco } from "@/components/modules/horarios-equipe/types";

export default async function HorariosEquipePage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const { ano: anoParam } = await searchParams;
  const ano = Number(anoParam) || new Date().getFullYear();

  const blocosRaw = await prisma.escalaEquipeBloco.findMany({
    where: { ano },
    orderBy: { ordem: "asc" },
  });
  const blocos = blocosRaw as unknown as ItemEscalaBloco[];

  const turnos = blocos.filter((b) => b.tipo === "TURNO");
  const notas = blocos.filter((b) => b.tipo === "NOTA");

  return (
    <div>
      <PageHeader
        title="Horários da Equipe"
        subtitle={`Entrada e saída por contraturno/turma — ano letivo ${ano}`}
      />

      {blocos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-cda-border bg-white py-16 text-center">
          <Clock className="h-8 w-8 text-cda-text3" />
          <p className="text-sm text-cda-text3">Ainda não tem escala cadastrada para {ano}.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {turnos.map((bloco) => (
              <EscalaBlocoCard key={bloco.id} bloco={bloco} />
            ))}
          </div>

          {notas.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-cda-text3 uppercase tracking-wide">
                Organização e avisos
              </h2>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {notas.map((bloco) => (
                  <EscalaBlocoCard key={bloco.id} bloco={bloco} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
