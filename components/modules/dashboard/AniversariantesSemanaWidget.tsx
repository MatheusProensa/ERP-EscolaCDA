import Link from "next/link";
import { Cake } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";
import { podeVerModulo } from "@/lib/permissoes";
import { hojeBrasilia } from "@/lib/utils";

const MESES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Próximos N dias (incluindo hoje), como pares mês/dia — usado pra achar
 * quem faz aniversário nessa janela sem se importar com o ano de
 * nascimento (mesmo raciocínio de app/(erp)/aniversariantes/page.tsx, só
 * que por semana em vez de por mês calendário). */
function proximosDias(hoje: Date, n: number): { mes: number; dia: number }[] {
  const dias: { mes: number; dia: number }[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(hoje);
    d.setUTCDate(d.getUTCDate() + i);
    dias.push({ mes: d.getUTCMonth() + 1, dia: d.getUTCDate() });
  }
  return dias;
}

/** Aniversariantes da semana (Dashboard, redesign — pedido do dono, mockup
 * de referência) — mesma lógica de dado real de app/(erp)/aniversariantes/
 * page.tsx (aluno matriculado + funcionário, cada seção só busca se a
 * pessoa tem acesso de verdade ao setor), só que a janela é "próximos 7
 * dias" em vez de "mês calendário". */
export async function AniversariantesSemanaWidget() {
  const session = await auth();
  if (!session) return null;
  const role = session.user.role;
  const permissoes = session.user.permissoes;
  const podeAlunos = podeVerModulo("/alunos", role, permissoes);
  const podeFuncionarios = podeVerModulo("/funcionarios", role, permissoes);
  if (!podeAlunos && !podeFuncionarios) return null;

  const hoje = hojeBrasilia();
  const janela = proximosDias(hoje, 7);
  const chaveJanela = new Set(janela.map((d) => `${d.mes}-${d.dia}`));

  const anoLetivo = await getAnoLetivoAtivo();
  const [matriculas, funcionarios] = await Promise.all([
    podeAlunos
      ? prisma.matricula.findMany({
          where: { situacao: "ATIVA", anoLetivoId: anoLetivo?.id },
          select: { alunoId: true, aluno: { select: { nome: true, foto: true, dataNascimento: true } }, turma: { select: { nome: true } } },
        })
      : Promise.resolve([]),
    podeFuncionarios ? prisma.funcionario.findMany({ select: { id: true, nome: true, cargo: true, dataNascimento: true } }) : Promise.resolve([]),
  ]);

  type Pessoa = { id: string; nome: string; foto: string | null; dataNascimento: Date; detalhe: string; href: string };

  const porAluno = new Map<string, Pessoa & { turmas: string[] }>();
  for (const m of matriculas) {
    const existente = porAluno.get(m.alunoId);
    if (existente) existente.turmas.push(m.turma.nome);
    else
      porAluno.set(m.alunoId, {
        id: m.alunoId,
        nome: m.aluno.nome,
        foto: m.aluno.foto,
        dataNascimento: m.aluno.dataNascimento,
        turmas: [m.turma.nome],
        detalhe: "",
        href: `/alunos/${m.alunoId}`,
      });
  }
  const alunos: Pessoa[] = Array.from(porAluno.values())
    .filter((a) => chaveJanela.has(`${a.dataNascimento.getUTCMonth() + 1}-${a.dataNascimento.getUTCDate()}`))
    .map((a) => ({ ...a, detalhe: a.turmas.join(" + ") }));

  const funcionariosAniversariantes: Pessoa[] = funcionarios
    .filter((f) => f.dataNascimento && chaveJanela.has(`${f.dataNascimento.getUTCMonth() + 1}-${f.dataNascimento.getUTCDate()}`))
    .map((f) => ({ id: f.id, nome: f.nome, foto: null, dataNascimento: f.dataNascimento!, detalhe: f.cargo, href: `/funcionarios/${f.id}` }));

  const pessoas = [...alunos, ...funcionariosAniversariantes].sort((a, b) => {
    const chave = (d: Date) => janela.findIndex((j) => j.mes === d.getUTCMonth() + 1 && j.dia === d.getUTCDate());
    return chave(a.dataNascimento) - chave(b.dataNascimento);
  });

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <Cake className="h-[15px] w-[15px] text-cda-blue" />
          Aniversariantes · esta semana
        </span>
      }
      action={
        <Link href="/aniversariantes" className="text-sm font-medium text-cda-blue hover:underline">
          Ver tudo
        </Link>
      }
    >
      {pessoas.length === 0 ? (
        <EmptyState title="Ninguém faz aniversário nos próximos 7 dias." />
      ) : (
        <div className="flex flex-wrap gap-4 p-4">
          {pessoas.map((p) => (
            <Link key={p.id} href={p.href} className="flex w-24 flex-col items-center gap-1.5 text-center">
              <Avatar nome={p.nome} foto={p.foto} size="lg" />
              <span className="line-clamp-1 text-xs font-medium text-cda-text">{p.nome.split(" ")[0]}</span>
              <span className="text-[11px] text-cda-text3">
                {p.dataNascimento.getUTCDate()}/{MESES_CURTO[p.dataNascimento.getUTCMonth()]}
              </span>
              <span className="line-clamp-1 text-[11px] text-cda-text3">{p.detalhe}</span>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
