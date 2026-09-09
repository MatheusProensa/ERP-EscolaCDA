import Link from "next/link";
import { Users, ClipboardCheck, ClipboardX, TriangleAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, TableHead, Th, TableBody, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricCard } from "@/components/ui/MetricCard";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { EscutaAoVivo } from "@/components/ui/EscutaAoVivo";
import { ClassificacaoBadge } from "@/components/modules/avaliacao-nutricional/ClassificacaoBadge";
import { avaliarImcPorIdade, formatarIdade } from "@/lib/avaliacaoNutricional";
import { formatarData, hojeBrasilia } from "@/lib/utils";

/** Lista todo aluno com matrícula ativa (independente de já ter avaliação ou
 * não) — é a Nutricionista batendo os olhos em quem ainda falta avaliar,
 * não só em quem já tem histórico. */
export default async function AvaliacaoNutricionalPage() {
  const hoje = hojeBrasilia();

  const alunos = await prisma.aluno.findMany({
    where: { matriculas: { some: { situacao: "ATIVA" } } },
    select: {
      id: true,
      nome: true,
      foto: true,
      sexo: true,
      dataNascimento: true,
      avaliacoesNutricionais: { orderBy: { data: "desc" }, take: 1 },
      matriculas: {
        where: { situacao: "ATIVA" },
        select: { turma: { select: { nome: true } } },
        take: 1,
      },
    },
    orderBy: { nome: "asc" },
  });

  const linhas = alunos.map((a) => {
    const ultima = a.avaliacoesNutricionais[0];
    const resultado =
      ultima && a.sexo
        ? avaliarImcPorIdade({
            sexo: a.sexo,
            dataNascimento: a.dataNascimento,
            dataAvaliacao: ultima.data,
            pesoKg: ultima.pesoKg,
            alturaCm: ultima.alturaCm,
          })
        : null;
    return { aluno: a, ultima, resultado };
  });

  const avaliados = linhas.filter((l) => l.ultima).length;
  const pendentes = alunos.length - avaliados;
  const emAlerta = linhas.filter((l) => l.resultado && l.resultado.classificacao !== "EUTROFICO").length;

  return (
    <div>
      <EscutaAoVivo modulo="avaliacao-nutricional" />
      <PageHeader
        title="Avaliação Nutricional"
        subtitle="Peso, altura e classificação de IMC por idade (curva da OMS) — histórico por aluno"
      />

      {alunos.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricCard icon={Users} tone="cat1" value={alunos.length} label="Alunos matriculados" />
          <MetricCard icon={ClipboardCheck} tone="success" value={avaliados} label="Já avaliados" />
          <MetricCard icon={ClipboardX} tone="warning" value={pendentes} label="Sem avaliação ainda" />
          <MetricCard icon={TriangleAlert} tone="critical" value={emAlerta} label="Fora do eutrófico" subtext="Baixo peso, sobrepeso ou obesidade" />
        </div>
      )}

      <Card>
        {alunos.length === 0 ? (
          <EmptyState title="Nenhum aluno matriculado ainda" subtitle="Assim que houver matrícula ativa, ela aparece aqui pra avaliação." />
        ) : (
          <Table>
            <TableHead>
              <Th>Aluno</Th>
              <Th>Turma</Th>
              <Th>Idade</Th>
              <Th>Última avaliação</Th>
              <Th>Diagnóstico</Th>
            </TableHead>
            <TableBody>
              {linhas.map(({ aluno: a, ultima, resultado }) => (
                <Tr key={a.id}>
                  <Td>
                    <Link href={`/avaliacao-nutricional/${a.id}`} className="flex items-center gap-2.5 font-medium text-cda-text hover:text-cda-blue">
                      <Avatar nome={a.nome} foto={a.foto} size="sm" />
                      {a.nome}
                    </Link>
                  </Td>
                  <Td>{a.matriculas[0]?.turma.nome ?? "—"}</Td>
                  <Td>{formatarIdade(a.dataNascimento, hoje)}</Td>
                  <Td>{ultima ? formatarData(ultima.data) : <span className="text-cda-text3">—</span>}</Td>
                  <Td>
                    {!ultima ? (
                      <Badge variant="neutral">Sem avaliação</Badge>
                    ) : !a.sexo ? (
                      <span className="text-xs text-cda-amber">Falta &quot;Sexo&quot; no Censo</span>
                    ) : resultado ? (
                      <ClassificacaoBadge classificacao={resultado.classificacao} />
                    ) : null}
                  </Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
