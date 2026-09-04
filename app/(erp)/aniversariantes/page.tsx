import { Cake } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, TableHead, Th, TableBody, Tr, Td, TableEmpty } from "@/components/ui/Table";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ExportButtons } from "@/components/ui/ExportButtons";

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
  const hoje = new Date();
  const mesFiltro = mes ? Number(mes) : hoje.getUTCMonth() + 1;
  const anoAtual = hoje.getUTCFullYear();

  const anoLetivo = await getAnoLetivoAtivo();
  // NOVO: a foto (base64, pode pesar MB por aluno) só é buscada depois, e só de
  // quem realmente faz aniversário no mês filtrado — antes trazia a foto de todo
  // mundo matriculado só pra descartar a maioria no filtro em JS logo abaixo.
  const [matriculas, funcionarios] = await Promise.all([
    prisma.matricula.findMany({
      where: { situacao: "ATIVA", anoLetivoId: anoLetivo?.id },
      select: {
        alunoId: true,
        aluno: { select: { nome: true, dataNascimento: true } },
        turma: { select: { nome: true } },
      },
    }),
    prisma.funcionario.findMany({ where: { ativo: true, dataNascimento: { not: null } } }),
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

      <Card className="mb-5 p-4">
        <form className="flex flex-wrap items-center gap-3">
          <Select name="mes" defaultValue={String(mesFiltro)} className="w-full sm:w-48">
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="outline">
            Filtrar
          </Button>
        </form>
      </Card>

      <div className="flex flex-col gap-5">
        <ListaAniversariantes
          titulo="Alunos"
          colunaDetalhe="Turma"
          pessoas={alunosAniversariantes}
          hoje={hoje}
          anoAtual={anoAtual}
          mesFiltro={mesFiltro}
        />
        <ListaAniversariantes
          titulo="Funcionários"
          colunaDetalhe="Cargo"
          pessoas={funcionariosAniversariantes}
          hoje={hoje}
          anoAtual={anoAtual}
          mesFiltro={mesFiltro}
        />
      </div>
    </div>
  );
}

function ListaAniversariantes({
  titulo,
  colunaDetalhe,
  pessoas,
  hoje,
  anoAtual,
  mesFiltro,
}: {
  titulo: string;
  colunaDetalhe: string;
  pessoas: Pessoa[];
  hoje: Date;
  anoAtual: number;
  mesFiltro: number;
}) {
  return (
    <Card title={titulo} action={<Badge variant="count">{pessoas.length}</Badge>}>
      <Table>
        <TableHead>
          <Th>Nome</Th>
          <Th>{colunaDetalhe}</Th>
          <Th>Data</Th>
          <Th>Completa</Th>
        </TableHead>
        <TableBody>
          {pessoas.length === 0 && (
            <TableEmpty colSpan={4}>Nenhum aniversariante em {MESES[mesFiltro - 1]}.</TableEmpty>
          )}
          {pessoas.map((p) => (
            <Tr key={p.id}>
              <Td>
                <Link href={p.href} className="flex items-center gap-2.5 hover:text-cda-blue">
                  <Avatar nome={p.nome} foto={p.foto} size="sm" />
                  {p.nome}
                  {eHoje(p.dataNascimento, hoje) && <Badge variant="amber">Hoje</Badge>}
                </Link>
              </Td>
              <Td>{p.detalhe}</Td>
              <Td>
                {String(p.dataNascimento.getUTCDate()).padStart(2, "0")}/
                {String(p.dataNascimento.getUTCMonth() + 1).padStart(2, "0")}
              </Td>
              <Td>
                {idadeCompletando(p.dataNascimento, anoAtual)} {idadeCompletando(p.dataNascimento, anoAtual) === 1 ? "ano" : "anos"}
              </Td>
            </Tr>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
