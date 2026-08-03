import { prisma } from "@/lib/prisma";
import { getAnoLetivoAtivo } from "@/lib/anoLetivo";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { MensalidadesGerenciar } from "@/components/modules/financeiro/MensalidadesGerenciar";
import { ordenarTurmas } from "@/lib/utils";
import type { SituacaoMensalidade } from "@prisma/client";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const POR_PAGINA = 100;

export default async function MensalidadesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; situacao?: string; turma?: string; busca?: string; pagina?: string }>;
}) {
  const { mes, situacao, turma, busca, pagina: paginaRaw } = await searchParams;
  const pagina = Math.max(1, Number(paginaRaw) || 1);
  const hoje = new Date();

  const anoLetivo = await getAnoLetivoAtivo();

  // "Atrasada" é calculado (vencida e ainda não paga), não um valor gravado — nada no sistema
  // grava ATRASADA em `situacao`, então filtrar literalmente por esse valor nunca traria resultado.
  let situacaoWhere: { situacao?: SituacaoMensalidade; vencimento?: { lt?: Date; gte?: Date } } = {};
  if (situacao === "ATRASADA") {
    situacaoWhere = { situacao: "PENDENTE", vencimento: { lt: hoje } };
  } else if (situacao === "PENDENTE") {
    situacaoWhere = { situacao: "PENDENTE", vencimento: { gte: hoje } };
  } else if (situacao) {
    situacaoWhere = { situacao: situacao as SituacaoMensalidade };
  }

  const where = {
    mes: mes ? Number(mes) : undefined,
    ...situacaoWhere,
    matricula: {
      anoLetivoId: anoLetivo?.id,
      turmaId: turma || undefined,
      aluno: busca ? { nome: { contains: busca, mode: "insensitive" as const } } : undefined,
    },
  };

  // turmas (pro dropdown), total pra paginação e a página atual de mensalidades não
  // dependem uma da outra — rodam em paralelo em vez de round-trips sequenciais ao banco.
  const [turmasRaw, total, mensalidades] = await Promise.all([
    prisma.turma.findMany({ where: { anoLetivoId: anoLetivo?.id } }),
    prisma.mensalidade.count({ where }),
    prisma.mensalidade.findMany({
      where,
      select: {
        id: true,
        mes: true,
        ano: true,
        valor: true,
        vencimento: true,
        situacao: true,
        descricao: true,
        pagamentos: { select: { id: true, dataPagamento: true, valor: true }, orderBy: { dataPagamento: "desc" } },
        matricula: {
          select: {
            // "foto" fica de fora: é base64 e pesa MB por aluno, e aqui só vira um
            // avatar de 28px — até 100 linhas por página, não vale o payload.
            aluno: { select: { id: true, nome: true } },
            turma: { select: { nome: true } },
          },
        },
      },
      orderBy: [{ vencimento: "asc" }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
  ]);
  const turmas = ordenarTurmas(turmasRaw);
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  const paramsBase = new URLSearchParams();
  if (mes) paramsBase.set("mes", mes);
  if (situacao) paramsBase.set("situacao", situacao);
  if (turma) paramsBase.set("turma", turma);
  if (busca) paramsBase.set("busca", busca);
  function hrefPagina(p: number) {
    const params = new URLSearchParams(paramsBase);
    params.set("pagina", String(p));
    return `/financeiro/mensalidades?${params.toString()}`;
  }

  return (
    <div>
      <PageHeader
        title="Mensalidades"
        subtitle={`${total} mensalidade(s) encontrada(s)`}
        breadcrumb={[{ label: "Financeiro", href: "/financeiro" }, { label: "Mensalidades" }]}
      />

      <Card className="mb-5 p-4">
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          <Input name="busca" placeholder="Buscar por aluno..." defaultValue={busca} className="sm:col-span-2" />
          <Select name="mes" defaultValue={mes ?? ""}>
            <option value="">Todos os meses</option>
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </Select>
          <Select name="situacao" defaultValue={situacao ?? ""}>
            <option value="">Todas as situações</option>
            <option value="PAGA">Paga</option>
            <option value="PENDENTE">Pendente</option>
            <option value="ATRASADA">Atrasada</option>
            <option value="CANCELADA">Cancelada</option>
          </Select>
          <Select name="turma" defaultValue={turma ?? ""}>
            <option value="">Todas as turmas</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="outline" className="sm:col-span-5 sm:w-fit">
            Filtrar
          </Button>
        </form>
      </Card>

      <Card>
        <MensalidadesGerenciar mensalidades={mensalidades} />
        {totalPaginas > 1 && (
          <div className="flex items-center justify-center gap-4 border-t border-cda-border py-3 text-sm">
            {pagina > 1 ? (
              <Button href={hrefPagina(pagina - 1)} variant="outline" size="sm">
                Anterior
              </Button>
            ) : (
              <span className="inline-flex h-8 items-center rounded-lg border border-cda-border bg-white px-3 text-xs text-cda-text3 opacity-50">
                Anterior
              </span>
            )}
            <span className="text-cda-text3">
              Página {pagina} de {totalPaginas}
            </span>
            {pagina < totalPaginas ? (
              <Button href={hrefPagina(pagina + 1)} variant="outline" size="sm">
                Próxima
              </Button>
            ) : (
              <span className="inline-flex h-8 items-center rounded-lg border border-cda-border bg-white px-3 text-xs text-cda-text3 opacity-50">
                Próxima
              </span>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
