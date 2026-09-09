import { Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { BarraFiltro } from "@/components/ui/BarraFiltro";
import { EscalaBlocoCard } from "@/components/modules/horarios-equipe/EscalaBlocoCard";
import { NovoBlocoButton } from "@/components/modules/horarios-equipe/NovoBlocoButton";
import { HorariosExportButtons } from "@/components/modules/horarios-equipe/HorariosExportButtons";
import type { ItemEscalaBloco } from "@/components/modules/horarios-equipe/types";
import { podeEditarModulo } from "@/lib/permissoes";
import { hojeBrasilia } from "@/lib/utils";
import { EscutaAoVivo } from "@/components/ui/EscutaAoVivo";

export default async function HorariosEquipePage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const { ano: anoParam } = await searchParams;
  const session = await auth();
  const podeEditar = podeEditarModulo("/horarios-equipe", session?.user.role ?? "", session?.user.permissoes);
  // hojeBrasilia() (não new Date()): o ano padrão/atual do seletor viraria o
  // ANO SEGUINTE pra quem acessa entre 21h e meia-noite de 31/dez (Brasília)
  // — servidor roda em UTC, mesma causa raiz do "Gerado em" que já saiu
  // errado nos PDFs.
  const ano = Number(anoParam) || hojeBrasilia().getUTCFullYear();

  const blocosRaw = await prisma.escalaEquipeBloco.findMany({
    where: { ano },
    orderBy: { ordem: "asc" },
  });
  const blocos = blocosRaw as unknown as ItemEscalaBloco[];

  const turnos = blocos.filter((b) => b.tipo === "TURNO");
  const notas = blocos.filter((b) => b.tipo === "NOTA");

  const anoAtual = hojeBrasilia().getUTCFullYear();
  const anos = [anoAtual - 1, anoAtual, anoAtual + 1];
  // Evita sumir a opção do ano que está sendo visto se ele já saiu da janela
  // padrão (ex.: alguém guardou o link de um ano bem antigo ou futuro).
  if (!anos.includes(ano)) anos.push(ano);
  anos.sort((a, b) => a - b);

  return (
    <div>
      <EscutaAoVivo modulo="horarios-equipe" />
      <PageHeader
        title="Horários da Equipe"
        subtitle={`Entrada e saída por contraturno/turma — ano letivo ${ano}`}
        action={blocos.length > 0 ? <HorariosExportButtons ano={ano} /> : undefined}
      />

      <BarraFiltro
        selects={[
          {
            paramName: "ano",
            placeholder: "Ano",
            valorPadrao: String(ano),
            options: anos.map((a) => ({ value: String(a), label: String(a) })),
          },
        ]}
      />

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
