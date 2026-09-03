import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatarDataHora } from "@/lib/utils";
import type { BadgeVariant } from "@/components/ui/Badge";

const POR_PAGINA = 50;

// Lista real de entidades que o sistema grava hoje (ver `entidade:` em
// logAtividade.create pelo código) — cada uma com rótulo em português e cor
// própria, pra achar rápido numa lista longa em vez de precisar ler linha a linha.
const ENTIDADE_LABEL: Record<string, string> = {
  Aluno: "Aluno",
  Matricula: "Matrícula",
  Contrato: "Contrato",
  Funcionario: "Funcionário",
  Usuario: "Usuário",
  Boleto: "Boleto",
  NotaFiscal: "Nota Fiscal",
  ListaEspera: "Interessados",
  Interessado: "Interessados",
};

// Categórica (handoff de design, etapa 3.2): tipo de registro não é estado —
// sai o verde de "Boleto" e o vermelho de "Lista de Espera".
const ENTIDADE_VARIANT: Record<string, BadgeVariant> = {
  Aluno: "cat1",
  Matricula: "cat2",
  Contrato: "cat3",
  NotaFiscal: "cat4",
  Funcionario: "cat5",
  Usuario: "cat6",
  Boleto: "cat1",
  ListaEspera: "cat5",
  Interessado: "cat5",
};

export default async function LogAtividadesPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; entidade?: string; page?: string }>;
}) {
  const { busca, entidade, page } = await searchParams;
  const paginaAtual = Math.max(1, Number(page) || 1);

  const where = {
    AND: [
      busca ? { OR: [{ acao: { contains: busca, mode: "insensitive" as const } }, { usuario: { contains: busca, mode: "insensitive" as const } }] } : {},
      entidade ? { entidade } : {},
    ],
  };

  const [logs, total, entidades] = await Promise.all([
    prisma.logAtividade.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (paginaAtual - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    prisma.logAtividade.count({ where }),
    prisma.logAtividade.findMany({ distinct: ["entidade"], select: { entidade: true }, orderBy: { entidade: "asc" } }),
  ]);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  function paginaHref(p: number) {
    const params = new URLSearchParams();
    if (busca) params.set("busca", busca);
    if (entidade) params.set("entidade", entidade);
    params.set("page", String(p));
    return `/log-atividades?${params.toString()}`;
  }

  return (
    <div>
      <PageHeader
        title="Log de Atividades"
        subtitle="Histórico de quem fez o quê no sistema — pra rastrear e corrigir mudanças feitas sem querer"
      />

      <Card className="mb-5 p-4">
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Input name="busca" placeholder="Buscar por ação ou pessoa..." defaultValue={busca} className="sm:col-span-2" />
          <Select name="entidade" defaultValue={entidade ?? ""}>
            <option value="">Todos os tipos</option>
            {entidades.map((e) => (
              <option key={e.entidade} value={e.entidade}>
                {ENTIDADE_LABEL[e.entidade] ?? e.entidade}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="outline">
            Filtrar
          </Button>
        </form>
      </Card>

      <Card>
        {logs.length === 0 ? (
          <EmptyState title="Nenhuma atividade encontrada." />
        ) : (
          <div className="flex flex-col divide-y divide-cda-border">
            {logs.map((log) => (
              <div key={log.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-cda-text">{log.acao}</p>
                  <p className="text-xs text-cda-text3">
                    {log.usuario} · {formatarDataHora(log.createdAt)}
                  </p>
                </div>
                <Badge variant={ENTIDADE_VARIANT[log.entidade] ?? "neutral"}>{ENTIDADE_LABEL[log.entidade] ?? log.entidade}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {totalPaginas > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-cda-text2">
          <span>
            Página {paginaAtual} de {totalPaginas} ({total} registros)
          </span>
          <div className="flex gap-2">
            {paginaAtual > 1 && (
              <Button href={paginaHref(paginaAtual - 1)} variant="outline" size="sm">
                Anterior
              </Button>
            )}
            {paginaAtual < totalPaginas && (
              <Button href={paginaHref(paginaAtual + 1)} variant="outline" size="sm">
                Próxima
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
