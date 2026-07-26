import { Cake } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, TableHead, Th, TableBody, Tr, Td, TableEmpty } from "@/components/ui/Table";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { ExportButtons } from "@/components/ui/ExportButtons";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type Aniversariante = {
  alunoId: string;
  nome: string;
  foto: string | null;
  dataNascimento: Date;
  turmas: string[];
};

export default async function AniversariantesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const hoje = new Date();
  const mesFiltro = mes ? Number(mes) : hoje.getUTCMonth() + 1;
  const anoAtual = hoje.getUTCFullYear();

  const anoLetivo = await prisma.anoLetivo.findFirst({ where: { ativo: true } });
  const matriculas = await prisma.matricula.findMany({
    where: { situacao: "ATIVA", anoLetivoId: anoLetivo?.id },
    include: { aluno: true, turma: true },
  });

  const porAluno = new Map<string, Aniversariante>();
  for (const m of matriculas) {
    const existente = porAluno.get(m.alunoId);
    if (existente) {
      existente.turmas.push(m.turma.nome);
    } else {
      porAluno.set(m.alunoId, {
        alunoId: m.alunoId,
        nome: m.aluno.nome,
        foto: m.aluno.foto,
        dataNascimento: m.aluno.dataNascimento,
        turmas: [m.turma.nome],
      });
    }
  }

  const aniversariantes = Array.from(porAluno.values())
    .filter((a) => a.dataNascimento.getUTCMonth() + 1 === mesFiltro)
    .sort((a, b) => a.dataNascimento.getUTCDate() - b.dataNascimento.getUTCDate());

  const aniversariantesHoje = aniversariantes.filter(
    (a) => a.dataNascimento.getUTCMonth() === hoje.getUTCMonth() && a.dataNascimento.getUTCDate() === hoje.getUTCDate()
  );

  return (
    <div>
      <PageHeader
        title="Aniversariantes"
        subtitle="Alunos ativos que fazem aniversário no mês — pra marketing organizar fotos e stories"
        action={<ExportButtons href="/api/relatorios/aniversariantes" params={{ mes: String(mesFiltro) }} />}
      />

      {aniversariantesHoje.length > 0 && (
        <Card className="mb-5 flex items-center gap-4 border-cda-yellow bg-cda-yellow/10 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cda-yellow/30">
            <Cake className="h-5 w-5 text-cda-navy" />
          </div>
          <div>
            <p className="text-sm font-semibold text-cda-text">
              {aniversariantesHoje.length === 1
                ? `Hoje é aniversário de ${aniversariantesHoje[0].nome}!`
                : `Hoje é aniversário de ${aniversariantesHoje.length} alunos!`}
            </p>
            <p className="text-xs text-cda-text2">{aniversariantesHoje.map((a) => a.nome).join(", ")}</p>
          </div>
        </Card>
      )}

      <Card className="mb-5 p-4">
        <form className="flex items-center gap-3">
          <Select name="mes" defaultValue={String(mesFiltro)} className="w-48">
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </Select>
          <button
            type="submit"
            className="h-10 rounded-lg border border-cda-border bg-white px-4 text-sm font-medium text-cda-text hover:bg-cda-bg"
          >
            Filtrar
          </button>
        </form>
      </Card>

      <Card>
        <Table>
          <TableHead>
            <Th>Aluno</Th>
            <Th>Turma</Th>
            <Th>Data</Th>
            <Th>Completa</Th>
          </TableHead>
          <TableBody>
            {aniversariantes.length === 0 && (
              <TableEmpty colSpan={4}>Nenhum aniversariante em {MESES[mesFiltro - 1]}.</TableEmpty>
            )}
            {aniversariantes.map((a) => {
              const ehHoje =
                a.dataNascimento.getUTCMonth() === hoje.getUTCMonth() && a.dataNascimento.getUTCDate() === hoje.getUTCDate();
              const idade = anoAtual - a.dataNascimento.getUTCFullYear();
              return (
                <Tr key={a.alunoId}>
                  <Td>
                    <a href={`/alunos/${a.alunoId}`} className="flex items-center gap-2.5 hover:text-cda-blue">
                      <Avatar nome={a.nome} foto={a.foto} size="sm" />
                      {a.nome}
                      {ehHoje && <Badge variant="amber">Hoje</Badge>}
                    </a>
                  </Td>
                  <Td>{a.turmas.join(" + ")}</Td>
                  <Td>{String(a.dataNascimento.getUTCDate()).padStart(2, "0")}/{String(a.dataNascimento.getUTCMonth() + 1).padStart(2, "0")}</Td>
                  <Td>{idade} {idade === 1 ? "ano" : "anos"}</Td>
                </Tr>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
