import { GraduationCap, Sparkles, NotebookPen, FileText, Image as ImageIcon } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

const TURNO_LABEL: Record<string, string> = { MANHA: "Manhã", TARDE: "Tarde" };

// As 3 entregas da Área Pedagógica ainda não existem — mostradas aqui como
// prévia do que vem a seguir, pra já dar contexto do que essa tela vai virar
// (task #18: parecer, planejamento e portfólio, cada um com prazo e status).
const ENTREGAS_FUTURAS = [
  { label: "Planejamento", icon: NotebookPen },
  { label: "Parecer", icon: FileText },
  { label: "Portfólio", icon: ImageIcon },
];

/** Hub da professora dentro da Área Pedagógica — por enquanto só mostra o
 * vínculo dela (turma como regente, matéria×turmas como especialista), sem
 * nenhuma entrega ainda (isso vem nos próximos passos da task #18). É a base
 * onde planejamento/parecer/portfólio vão aparecer por turma. */
export default async function PedagogicoPage() {
  const session = await auth();
  const vinculos = session?.user.id
    ? await prisma.vinculoPedagogico.findMany({
        where: { userId: session.user.id },
        include: { turma: { select: { id: true, nome: true, turno: true } } },
        orderBy: { turma: { nome: "asc" } },
      })
    : [];

  const comoRegente = vinculos.filter((v) => v.papel === "REGENTE");
  const comoEspecialista = vinculos.filter((v) => v.papel === "ESPECIALISTA");

  // Agrupa especialista por matéria — a mesma pessoa dá a mesma matéria em
  // várias turmas (achado real, out/2026: Ed. Física, Musicalização, Inglês).
  const especialistaPorMateria = new Map<string, typeof comoEspecialista>();
  for (const v of comoEspecialista) {
    const chave = v.materia ?? "Sem matéria";
    especialistaPorMateria.set(chave, [...(especialistaPorMateria.get(chave) ?? []), v]);
  }

  return (
    <div>
      <PageHeader title="Área Pedagógica" subtitle="Suas turmas — parecer, planejamento e portfólio chegam aqui em breve" />

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
                {comoRegente.map((v) => (
                  <Card key={v.id} className="p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-cda-blue" />
                      <span className="text-sm font-semibold text-cda-text">{v.turma.nome}</span>
                      <span className="text-xs text-cda-text3">({TURNO_LABEL[v.turma.turno] ?? v.turma.turno})</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ENTREGAS_FUTURAS.map(({ label, icon: Icon }) => (
                        <Badge key={label} variant="neutral">
                          <Icon className="h-3 w-3" />
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                ))}
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
