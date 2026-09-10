import { prisma } from "@/lib/prisma";
import { ordenarTurmas } from "@/lib/utils";

export type AlunoConfirmacao = {
  alunoId: string;
  nome: string;
  foto: string | null;
  confirmacao: {
    id: string;
    status: string;
    adultos: number | null;
    criancas: number | null;
    horario: string | null;
    compareceu: boolean | null;
    observacao: string | null;
  } | null;
};

export type TurmaConfirmacoes = { turmaId: string; turmaNome: string; alunos: AlunoConfirmacao[] };

/** Turmas + alunos matriculados (ativos) no ano letivo do evento, cada um já
 * casado com a confirmação existente (ou `null`, pra "ainda sem linha" virar
 * "Sem resposta" na tela sem precisar criar uma linha em branco por aluno só
 * de abrir a página). Usado tanto pela página quanto pela API — uma fonte só
 * pra não desalinhar o SSR do fetch de atualização. */
export async function buscarTurmasComConfirmacoes(eventoAnoLetivoId: string, eventoId: string): Promise<TurmaConfirmacoes[]> {
  const [turmasRaw, confirmacoes] = await Promise.all([
    prisma.turma.findMany({
      where: { anoLetivoId: eventoAnoLetivoId },
      include: {
        matriculas: { where: { situacao: "ATIVA" }, include: { aluno: { select: { id: true, nome: true, foto: true } } } },
      },
    }),
    prisma.confirmacaoFestaFamilia.findMany({ where: { eventoId } }),
  ]);

  const confirmacaoPorAluno = new Map(confirmacoes.map((c) => [c.alunoId, c]));

  return ordenarTurmas(turmasRaw).map((turma) => ({
    turmaId: turma.id,
    turmaNome: turma.nome,
    alunos: [...turma.matriculas]
      .sort((a, b) => a.aluno.nome.localeCompare(b.aluno.nome, "pt-BR"))
      .map((m) => ({
        alunoId: m.aluno.id,
        nome: m.aluno.nome,
        foto: m.aluno.foto,
        confirmacao: confirmacaoPorAluno.get(m.aluno.id) ?? null,
      })),
  }));
}

/** Acha o evento mais recente do ano letivo ativo ou cria um novo na hora —
 * a Duda não precisa configurar nada antes de começar a usar a tela; se um
 * dia a escola quiser dois eventos no mesmo ano, dá pra trocar pra uma tela
 * de seleção depois (o modelo já suporta N eventos por ano). */
export async function eventoFamiliaAtualOuNovo() {
  const anoLetivo = await prisma.anoLetivo.findFirst({ where: { ativo: true } });
  if (!anoLetivo) return null;

  const existente = await prisma.eventoFamilia.findFirst({
    where: { anoLetivoId: anoLetivo.id },
    orderBy: { createdAt: "desc" },
  });
  if (existente) return existente;

  return prisma.eventoFamilia.create({
    data: { nome: `Festa da Família ${anoLetivo.ano}`, anoLetivoId: anoLetivo.id },
  });
}
