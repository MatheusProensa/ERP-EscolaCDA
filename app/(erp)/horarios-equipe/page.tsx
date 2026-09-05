import { Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { EscalaBlocoCard } from "@/components/modules/horarios-equipe/EscalaBlocoCard";
import { NovoBlocoButton } from "@/components/modules/horarios-equipe/NovoBlocoButton";
import { HorariosExportButtons } from "@/components/modules/horarios-equipe/HorariosExportButtons";
import type { ItemEscalaBloco } from "@/components/modules/horarios-equipe/types";
import { podeEditarModulo } from "@/lib/permissoes";

export default async function HorariosEquipePage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const { ano: anoParam } = await searchParams;
  const session = await auth();
  const podeEditar = podeEditarModulo("/horarios-equipe", session?.user.role ?? "", session?.user.permissoes);
  const ano = Number(anoParam) || new Date().getFullYear();

  const blocosRaw = await prisma.escalaEquipeBloco.findMany({
    where: { ano },
    orderBy: { ordem: "asc" },
  });
  const blocos = blocosRaw as unknown as ItemEscalaBloco[];

  const turnos = blocos.filter((b) => b.tipo === "TURNO");
  const notas = blocos.filter((b) => b.tipo === "NOTA");

  const anoAtual = new Date().getFullYear();
  const anos = [anoAtual - 1, anoAtual, anoAtual + 1];
  // Evita sumir a opção do ano que está sendo visto se ele já saiu da janela
  // padrão (ex.: alguém guardou o link de um ano bem antigo ou futuro).
  if (!anos.includes(ano)) anos.push(ano);
  anos.sort((a, b) => a - b);

  return (
    <div>
      <PageHeader
        title="Horários da Equipe"
        subtitle={`Entrada e saída por contraturno/turma — ano letivo ${ano}`}
        action={blocos.length > 0 ? <HorariosExportButtons ano={ano} /> : undefined}
      />

      <Card className="mb-5 p-4">
        <form className="flex flex-wrap items-center gap-3">
          <Select name="ano" defaultValue={String(ano)} className="w-full sm:w-28">
            {anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="outline">
            Filtrar
          </Button>
        </form>
      </Card>

      {blocos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-cda-border bg-white py-16 text-center">
          <Clock className="h-8 w-8 text-cda-text3" />
          <p className="text-sm text-cda-text3">Ainda não tem escala cadastrada para {ano}.</p>
          {podeEditar && (
            <div className="mt-2 flex w-full max-w-md flex-col gap-3 px-6 sm:flex-row">
              <NovoBlocoButton ano={ano} tipo="TURNO" label="Nova turma/turno" placeholder="Ex.: Contraturno IV / 1º Ano EF" />
              <NovoBlocoButton ano={ano} tipo="NOTA" label="Novo aviso" placeholder="Ex.: Organização das turmas" />
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {turnos.map((bloco, i) => (
              <EscalaBlocoCard
                key={bloco.id}
                bloco={bloco}
                anterior={i > 0 ? turnos[i - 1] : undefined}
                proximo={i < turnos.length - 1 ? turnos[i + 1] : undefined}
                podeEditar={podeEditar}
              />
            ))}
            {podeEditar && (
              <NovoBlocoButton ano={ano} tipo="TURNO" label="Nova turma/turno" placeholder="Ex.: Contraturno IV / 1º Ano EF" />
            )}
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-cda-text3 uppercase tracking-wide">
              Organização e avisos
            </h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {notas.map((bloco, i) => (
                <EscalaBlocoCard
                  key={bloco.id}
                  bloco={bloco}
                  anterior={i > 0 ? notas[i - 1] : undefined}
                  proximo={i < notas.length - 1 ? notas[i + 1] : undefined}
                  podeEditar={podeEditar}
                />
              ))}
              {podeEditar && (
                <NovoBlocoButton ano={ano} tipo="NOTA" label="Novo aviso" placeholder="Ex.: Organização das turmas" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
