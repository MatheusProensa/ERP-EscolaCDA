import Link from "next/link";
import { GraduationCap, Sparkles, NotebookPen, FileText, Image as ImageIcon, ClipboardCheck } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { TemasPlanejamentoSecao } from "@/components/modules/pedagogico/TemasPlanejamentoSecao";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";
import { hojeBrasilia } from "@/lib/utils";
import { segundaFeiraDe } from "@/lib/planejamento";

const TURNO_LABEL: Record<string, string> = { MANHA: "Manhã", TARDE: "Tarde" };

// Parecer e Portfólio ainda não existem — mostrados como badge "em breve"
// pra já dar contexto do que essa tela vai virar (task #18). Planejamento já
// é real, virou link de verdade em vez de badge inerte.
const ENTREGAS_EM_BREVE = [
  { label: "Parecer", icon: FileText },
  { label: "Portfólio", icon: ImageIcon },
];

/** Hub da professora dentro da Área Pedagógica — por enquanto só mostra o
 * vínculo dela (turma como regente, matéria×turmas como especialista), sem
 * nenhuma entrega ainda (isso vem nos próximos passos da task #18). É a base
 * onde planejamento/parecer/portfólio vão aparecer por turma. */
export default async function PedagogicoPage() {
  const session = await auth();
  const souCoordenadora = session?.user.role === "ADMIN" || !!session?.user.coordenaAreaPedagogica;
  const semanaAtual = segundaFeiraDe(hojeBrasilia());

  const [vinculos, temas, anoLetivo] = await Promise.all([
    session?.user.id
      ? prisma.vinculoPedagogico.findMany({
          where: { userId: session.user.id },
          include: { turma: { select: { id: true, nome: true, turno: true } } },
          orderBy: { turma: { nome: "asc" } },
        })
      : Promise.resolve([]),
    prisma.temaPlanejamento.findMany({ orderBy: { titulo: "asc" } }),
    getAnoLetivoAtivo(),
  ]);

  const comoRegente = vinculos.filter((v) => v.papel === "REGENTE");
  const comoEspecialista = vinculos.filter((v) => v.papel === "ESPECIALISTA");

  // Agrupa especialista por matéria — a mesma pessoa dá a mesma matéria em
  // várias turmas (achado real, out/2026: Ed. Física, Musicalização, Inglês).
  const especialistaPorMateria = new Map<string, typeof comoEspecialista>();
  for (const v of comoEspecialista) {
    const chave = v.materia ?? "Sem matéria";
    especialistaPorMateria.set(chave, [...(especialistaPorMateria.get(chave) ?? []), v]);
  }

  // "Entregue" = já tem pelo menos 1 dia preenchido no planejamento dessa
  // semana — é o pedido original da coordenadora (saber quem entregou e quem
  // não). Sem prazo configurável ainda (a semana em si já é o ciclo), só o
  // status calculado a partir do que já existe.
  const entreguesSemanaAtual = new Set(
    (
      await prisma.planejamento.findMany({
        where: { semanaInicio: semanaAtual, dias: { some: {} } },
        select: { turmaId: true },
      })
    ).map((p) => p.turmaId)
  );

  // Coordenadora vê TODAS as turmas do ano letivo ativo, com a regente e o
  // status da semana — é o "dashboard bem bom pra acompanhar as professoras"
  // pedido desde o início.
  const todasTurmas = souCoordenadora && anoLetivo
    ? await prisma.turma.findMany({
        where: { anoLetivoId: anoLetivo.id },
        orderBy: { nome: "asc" },
        include: { vinculosPedagogico: { where: { papel: "REGENTE" }, include: { user: { select: { name: true } } } } },
      })
    : [];

  return (
    <div>
      <PageHeader title="Área Pedagógica" subtitle="Suas turmas — parecer, planejamento e portfólio chegam aqui em breve" />

      <div className="mb-5">
        <TemasPlanejamentoSecao temas={temas} souCoordenadora={souCoordenadora} />
      </div>

      {souCoordenadora && todasTurmas.length > 0 && (
        <div className="mb-5">
          <Card
            title={
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-cda-blue" />
                Planejamento da semana — todas as turmas
              </div>
            }
          >
            <div className="flex flex-col divide-y divide-cda-border">
              {todasTurmas.map((turma) => {
                const regente = turma.vinculosPedagogico[0]?.user.name;
                const entregue = entreguesSemanaAtual.has(turma.id);
                return (
                  <div key={turma.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                    <div>
                      <Link href={`/pedagogico/planejamento/${turma.id}`} className="text-sm font-medium text-cda-text hover:text-cda-blue hover:underline">
                        {turma.nome}
                      </Link>
                      <span className="ml-2 text-xs text-cda-text3">{regente ? `Regente: ${regente}` : "Sem regente vinculada"}</span>
                    </div>
                    <Badge variant={entregue ? "success" : "warning"}>{entregue ? "Entregue" : "Pendente"}</Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {vinculos.length === 0 ? (
        <Card>
          <EmptyState
            icon={GraduationCap}
            title="Você ainda não tem turma vinculada"
            subtitle='Peça pra Direção configurar isso na tela de Usuários, na seção "Vínculo com turmas".'
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {comoRegente.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-cda-text">Como regente</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {comoRegente.map((v) => {
                  const entregue = entreguesSemanaAtual.has(v.turma.id);
                  return (
                    <Card key={v.id} className="p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-cda-blue" />
                        <span className="text-sm font-semibold text-cda-text">{v.turma.nome}</span>
                        <span className="text-xs text-cda-text3">({TURNO_LABEL[v.turma.turno] ?? v.turma.turno})</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link
                          href={`/pedagogico/planejamento/${v.turma.id}`}
                          className="inline-flex items-center gap-1 rounded-full bg-cda-blue/10 px-2.5 py-0.5 text-xs font-medium text-cda-blue hover:bg-cda-blue/20"
                        >
                          <NotebookPen className="h-3 w-3" />
                          Planejamento
                        </Link>
                        <Badge variant={entregue ? "success" : "warning"}>
                          {entregue ? "Entregue essa semana" : "Pendente essa semana"}
                        </Badge>
                        {ENTREGAS_EM_BREVE.map(({ label, icon: Icon }) => (
                          <Badge key={label} variant="neutral">
                            <Icon className="h-3 w-3" />
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {especialistaPorMateria.size > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-cda-text">Como especialista</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...especialistaPorMateria.entries()].map(([materia, vs]) => (
                  <Card key={materia} className="p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-cda-amber" />
                      <span className="text-sm font-semibold text-cda-text">{materia}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {vs.map((v) => (
                        <Badge key={v.id} variant="cat5">
                          {v.turma.nome}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
