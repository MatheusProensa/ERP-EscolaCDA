import Link from "next/link";
import { Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, TableHead, Th, TableBody, Tr, Td, TableEmpty } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ExportButtons } from "@/components/ui/ExportButtons";
import { GerenciarParticipantesModal } from "@/components/modules/ponto/GerenciarParticipantesModal";
import { JornadaPrevistaCell } from "@/components/modules/ponto/JornadaPrevistaCell";
import { calcularMes, minParaHora, type RegistroPontoDia } from "@/lib/ponto";
import { hojeBrasilia } from "@/lib/utils";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default async function PontoPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string }>;
}) {
  const { mes, ano: anoParam } = await searchParams;
  const hoje = hojeBrasilia();
  const mesFiltro = mes ? Number(mes) : hoje.getUTCMonth() + 1;
  const ano = anoParam ? Number(anoParam) : hoje.getUTCFullYear();
  const anoAtual = hoje.getUTCFullYear();

  const todosFuncionarios = await prisma.funcionario.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, cargo: true, setor: true, participaPonto: true, jornadaPrevistaMinutos: true },
  });
  const funcionarios = todosFuncionarios.filter((f) => f.participaPonto);

  const registros = await prisma.registroPonto.findMany({
    where: { funcionarioId: { in: funcionarios.map((f) => f.id) } },
    orderBy: { data: "asc" },
  });
  const registrosPorFuncionario = new Map<string, typeof registros>();
  for (const r of registros) {
    const lista = registrosPorFuncionario.get(r.funcionarioId) ?? [];
    lista.push(r);
    registrosPorFuncionario.set(r.funcionarioId, lista);
  }

  const linhas = funcionarios.map((f) => {
    const registrosFuncionario = registrosPorFuncionario.get(f.id) ?? [];
    const dias = calcularMes(registrosFuncionario as RegistroPontoDia[], f.jornadaPrevistaMinutos ?? 0);
    const saldoAtual = dias.length > 0 ? dias[dias.length - 1].saldoAcumulado : 0;
    const registrosNoMes = registrosFuncionario.filter(
      (r) => r.data.getUTCFullYear() === ano && r.data.getUTCMonth() + 1 === mesFiltro
    ).length;
    return { funcionario: f, saldoAtual, registrosNoMes };
  });

  return (
    <div>
      <PageHeader
        title="Ponto"
        subtitle="Lançamento das folhas de ponto e cálculo automático de horas (tolerância CLT, adicional noturno e banco de horas)"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <GerenciarParticipantesModal funcionarios={todosFuncionarios} />
            <div className="mx-1 hidden h-7 w-px bg-cda-border sm:block" />
            <ExportButtons href="/api/relatorios/ponto" params={{ mes: String(mesFiltro), ano: String(ano) }} />
          </div>
        }
      />

      <Card className="mb-5 p-4">
        <form className="flex flex-wrap items-end gap-3">
          <Select label="Mês" name="mes" defaultValue={String(mesFiltro)} className="w-40">
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </Select>
          <Select label="Ano" name="ano" defaultValue={String(ano)} className="w-28">
            {[anoAtual - 1, anoAtual, anoAtual + 1].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </Select>
          <Button type="submit" variant="outline">
            Filtrar
          </Button>
        </form>
      </Card>

      <Card>
        <Table>
          <TableHead>
            <Th>Funcionário</Th>
            <Th>Cargo</Th>
            <Th>Jornada prevista</Th>
            <Th>Lançamentos em {MESES[mesFiltro - 1]}</Th>
            <Th>Saldo acumulado</Th>
            <Th>{""}</Th>
          </TableHead>
          <TableBody>
            {linhas.length === 0 && (
              <TableEmpty colSpan={6}>
                Nenhum funcionário participando do Ponto ainda. Use &quot;Gerenciar participantes&quot; pra adicionar.
              </TableEmpty>
            )}
            {linhas.map(({ funcionario: f, saldoAtual, registrosNoMes }) => (
              <Tr key={f.id}>
                <Td>
                  <Link href={`/ponto/${f.id}`} className="flex items-center gap-2 font-medium text-cda-text hover:text-cda-blue">
                    <Clock className="h-4 w-4 text-cda-text3" />
                    {f.nome}
                  </Link>
                </Td>
                <Td>{f.cargo}</Td>
                <Td>
                  <JornadaPrevistaCell funcionarioId={f.id} minutosIniciais={f.jornadaPrevistaMinutos} />
                </Td>
                <Td>{registrosNoMes} dia(s)</Td>
                <Td>
                  <Badge variant={saldoAtual < 0 ? "red" : saldoAtual > 0 ? "green" : "gray"}>
                    {minParaHora(saldoAtual)}
                  </Badge>
                </Td>
                <Td>
                  <Button href={`/ponto/${f.id}`} size="sm" variant="outline" className="whitespace-nowrap">
                    Lançar ponto
                  </Button>
                </Td>
              </Tr>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
