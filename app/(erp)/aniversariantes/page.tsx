import { Cake } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, TableHead, Th, TableBody, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { BarraFiltro } from "@/components/ui/BarraFiltro";
import { Alert } from "@/components/ui/Alert";
import { ExportButtons } from "@/components/ui/ExportButtons";
import { podeVerModulo } from "@/lib/permissoes";
import { hojeBrasilia } from "@/lib/utils";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type Pessoa = {
  id: string;
  nome: string;
  foto: string | null;
  dataNascimento: Date;
  detalhe: string;
  href: string;
};

function eDoMes(d: Date, mes: number) {
  return d.getUTCMonth() + 1 === mes;
}
function eHoje(d: Date, hoje: Date) {
  return d.getUTCMonth() === hoje.getUTCMonth() && d.getUTCDate() === hoje.getUTCDate();
}
function idadeCompletando(d: Date, ano: number) {
  return ano - d.getUTCFullYear();
}

export default async function AniversariantesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const hoje = hojeBrasilia();
  const mesFiltro = mes ? Number(mes) : hoje.getUTCMonth() + 1;
  const anoAtual = hoje.getUTCFullYear();

  // Achado real (mesma classe do bug já corrigido nos Dashboards, set/2026):
  // essa tela mostrava aniversariante de Aluno E de Funcionário pra qualquer
  // um que tivesse acesso a "Aniversariantes" na grade, mesmo sem acesso a
  // Alunos ou a Funcionários de verdade (ex.: nutricionista com grade só em
  // Aniversariantes+Cardápio via "Só visualizar" via Role Administrativo
  // via grade). Cada seção agora confere o setor de verdade antes de buscar
  // e de mostrar.
  const session = await auth();
  const role = session?.user.role ?? "";
  const permissoes = session?.user.permissoes;
  const podeAlunos = podeVerModulo("/alunos", role, permissoes);
  const podeFuncionarios = podeVerModulo("/funcionarios", role, permissoes);

  const anoLetivo = await getAnoLetivoAtivo();
  // NOVO: a foto (base64, pode pesar MB por aluno) só é buscada depois, e só de
  // quem realmente faz aniversário no mês filtrado — antes trazia a foto de todo
  // mundo matriculado só pra descartar a maioria no filtro em JS logo abaixo.
  const [matriculas, funcionarios] = await Promise.all([
    podeAlunos
      ? prisma.matricula.findMany({
          where: { situacao: "ATIVA", anoLetivoId: anoLetivo?.id },
          select: {
            alunoId: true,
            aluno: { select: { nome: true, dataNascimento: true } },
            turma: { select: { nome: true } },
          },
        })
      : Promise.resolve([]),
    // Sem filtro por dataNascimento aqui — esse mesmo funcionario serve tanto
    // pro aniversário de nascimento quanto pro de empresa (que usa admissao,
    // sempre preenchida), e nem todo mundo tem data de nascimento cadastrada.
    podeFuncionarios ? prisma.funcionario.findMany() : Promise.resolve([]),
  ]);

  const porAluno = new Map<string, Pessoa & { turmas: string[] }>();
  for (const m of matriculas) {
    const existente = porAluno.get(m.alunoId);
    if (existente) {
      existente.turmas.push(m.turma.nome);
    } else {
      porAluno.set(m.alunoId, {
        id: m.alunoId,
        nome: m.aluno.nome,
        foto: null,
        dataNascimento: m.aluno.dataNascimento,
        turmas: [m.turma.nome],
        detalhe: "",
        href: `/alunos/${m.alunoId}`,
      });
    }
  }

  const alunosDoMes = Array.from(porAluno.values()).filter((a) => eDoMes(a.dataNascimento, mesFiltro));
  const fotos =
    alunosDoMes.length > 0
      ? await prisma.aluno.findMany({ where: { id: { in: alunosDoMes.map((a) => a.id) } }, select: { id: true, foto: true } })
      : [];
  const fotoPorAlunoId = new Map(fotos.map((f) => [f.id, f.foto]));

  const alunosAniversariantes = alunosDoMes
    .sort((a, b) => a.dataNascimento.getUTCDate() - b.dataNascimento.getUTCDate())
    .map((a) => ({ ...a, foto: fotoPorAlunoId.get(a.id) ?? null, detalhe: a.turmas.join(" + ") }));

  const funcionariosAniversariantes: Pessoa[] = funcionarios
    .filter((f) => f.dataNascimento && eDoMes(f.dataNascimento, mesFiltro))
    .sort((a, b) => a.dataNascimento!.getUTCDate() - b.dataNascimento!.getUTCDate())
    .map((f) => ({
      id: f.id,
      nome: f.nome,
      foto: null,
      dataNascimento: f.dataNascimento!,
      detalhe: f.cargo,
      href: `/funcionarios/${f.id}`,
    }));

  // Aniversário de empresa — pedido da Duda (set/2026) pra parabenizar quem
  // completa X anos de casa na reunião mensal, mesmo padrão de aniversário de
  // nascimento, só que contado a partir da admissão. Só quem já completou pelo
  // menos 1 ano entra na lista (ninguém "completa 0 anos de empresa").
  const funcionariosEmpresa: Pessoa[] = funcionarios
    .filter((f) => eDoMes(f.admissao, mesFiltro) && idadeCompletando(f.admissao, anoAtual) > 0)
    .sort((a, b) => a.admissao.getUTCDate() - b.admissao.getUTCDate())
    .map((f) => ({
      id: f.id,
      nome: f.nome,
      foto: null,
      dataNascimento: f.admissao,
      detalhe: f.cargo,
      href: `/funcionarios/${f.id}`,
    }));

  const hojeTodos = [...alunosAniversariantes, ...funcionariosAniversariantes].filter((p) =>
    eHoje(p.dataNascimento, hoje)
  );

  return (
    <div>
      <PageHeader
        title="Aniversariantes"
        subtitle="Alunos e funcionários que fazem aniversário no mês — pra marketing organizar fotos e stories"
        action={<ExportButtons href="/api/relatorios/aniversariantes" params={{ mes: String(mesFiltro) }} />}
      />

      {hojeTodos.length > 0 && (
        <Alert
          tone="brand"
          icon={Cake}
          title={
            hojeTodos.length === 1
              ? `Hoje é aniversário de ${hojeTodos[0].nome}!`
              : `Hoje é aniversário de ${hojeTodos.length} pessoas!`
          }
          className="mb-5"
        >
          {hojeTodos.map((a) => a.nome).join(", ")}
        </Alert>
      )}

      <BarraFiltro
        selects={[
          {
            paramName: "mes",
            placeholder: "Mês",
            valorPadrao: String(mesFiltro),
            options: MESES.map((m, i) => ({ value: String(i + 1), label: m })),
          },
        ]}
      />

      <div className="flex flex-col gap-5">
        {podeAlunos && (
          <ListaAniversariantes
            titulo="Alunos"
            colunaDetalhe="Turma"
            pessoas={alunosAniversariantes}
            hoje={hoje}
            anoAtual={anoAtual}
            mesFiltro={mesFiltro}
          />
        )}
        {podeFuncionarios && (
          <>
            <ListaAniversariantes
              titulo="Funcionários"
              colunaDetalhe="Cargo"
              pessoas={funcionariosAniversariantes}
              hoje={hoje}
              anoAtual={anoAtual}
              mesFiltro={mesFiltro}
            />
            <ListaAniversariantes
              titulo="Aniversário de empresa"
              colunaDetalhe="Cargo"
              colunaData="Admissão"
              colunaCompleta="Completa"
              sufixoCompleta=" de empresa"
              pessoas={funcionariosEmpresa}
              hoje={hoje}
              anoAtual={anoAtual}
              mesFiltro={mesFiltro}
            />
          </>
        )}
      </div>
    </div>
  );
}

function ListaAniversariantes({
  titulo,
  colunaDetalhe,
  colunaData = "Data",
  colunaCompleta = "Completa",
  sufixoCompleta = "",
  pessoas,
  hoje,
  anoAtual,
  mesFiltro,
}: {
  titulo: string;
  colunaDetalhe: string;
  /** "Data" (padrão) diz respeito ao nascimento; "Aniversário de empresa" usa
   * "Admissão" — mesmo componente, rótulo diferente pra não confundir. */
  colunaData?: string;
  colunaCompleta?: string;
  /** Ex.: " de empresa" — vira "5 anos de empresa" em vez de só "5 anos". */
  sufixoCompleta?: string;
  pessoas: Pessoa[];
  hoje: Date;
  anoAtual: number;
  mesFiltro: number;
}) {
  if (pessoas.length === 0) {
    return (
      <Card title={titulo} action={<Badge variant="count">0</Badge>}>
        <EmptyState title={`Ninguém em ${MESES[mesFiltro - 1]}.`} />
      </Card>
    );
  }

  return (
    <Card title={titulo} action={<Badge variant="count">{pessoas.length}</Badge>}>
      {/* Celular: cartões — mesma razão de sempre, 4 colunas não cabem legíveis
          numa tela estreita (ver Avaliação Nutricional/Aluno, mesmo padrão). */}
      <div className="divide-y divide-cda-border sm:hidden">
        {pessoas.map((p) => (
          <Link key={p.id} href={p.href} className="flex items-center gap-3 p-4 active:bg-cda-bg">
            <Avatar nome={p.nome} foto={p.foto} size="md" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate font-medium text-cda-text">
                {p.nome}
                {eHoje(p.dataNascimento, hoje) && <Badge variant="warning">Hoje</Badge>}
              </p>
              <p className="truncate text-xs text-cda-text3">{p.detalhe}</p>
            </div>
            <div className="shrink-0 text-right text-xs text-cda-text2">
              <p className="font-medium text-cda-text">
                {String(p.dataNascimento.getUTCDate()).padStart(2, "0")}/
                {String(p.dataNascimento.getUTCMonth() + 1).padStart(2, "0")}
              </p>
              <p>
                {idadeCompletando(p.dataNascimento, anoAtual)} {idadeCompletando(p.dataNascimento, anoAtual) === 1 ? "ano" : "anos"}
                {sufixoCompleta}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Computador: tabela normal */}
      <Table className="hidden sm:table">
        <TableHead>
          <Th>Nome</Th>
          <Th>{colunaDetalhe}</Th>
          <Th>{colunaData}</Th>
          <Th>{colunaCompleta}</Th>
        </TableHead>
        <TableBody>
          {pessoas.map((p) => (
            <Tr key={p.id}>
              <Td>
                <Link href={p.href} className="flex items-center gap-2.5 hover:text-cda-blue">
                  <Avatar nome={p.nome} foto={p.foto} size="sm" />
                  {p.nome}
                  {eHoje(p.dataNascimento, hoje) && <Badge variant="warning">Hoje</Badge>}
                </Link>
              </Td>
              <Td>{p.detalhe}</Td>
              <Td>
                {String(p.dataNascimento.getUTCDate()).padStart(2, "0")}/
                {String(p.dataNascimento.getUTCMonth() + 1).padStart(2, "0")}
              </Td>
              <Td>
                {idadeCompletando(p.dataNascimento, anoAtual)} {idadeCompletando(p.dataNascimento, anoAtual) === 1 ? "ano" : "anos"}
                {sufixoCompleta}
              </Td>
            </Tr>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
