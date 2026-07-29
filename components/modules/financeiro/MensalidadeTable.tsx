"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Undo2, Pencil } from "lucide-react";
import type { Aluno, Mensalidade, Pagamento, SituacaoMensalidade, Turma } from "@prisma/client";
import { Table, TableHead, Th, TableBody, Tr, Td, TableEmpty } from "@/components/ui/Table";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { formatarData, formatarMoeda } from "@/lib/utils";
import { saldoDevedor } from "@/lib/inadimplencia";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const SITUACAO_VARIANT: Record<SituacaoMensalidade, BadgeVariant> = {
  PAGA: "green",
  PENDENTE: "gray",
  ATRASADA: "red",
  CANCELADA: "amber",
};

const SITUACAO_LABEL: Record<SituacaoMensalidade, string> = {
  PAGA: "Paga",
  PENDENTE: "Pendente",
  ATRASADA: "Atrasada",
  CANCELADA: "Cancelada",
};

export type MensalidadeLinha = Mensalidade & {
  pagamentos: Pagamento[];
  matricula?: { aluno: Aluno; turma: Turma };
};

export function MensalidadeTable({
  mensalidades,
  onRegistrarPagamento,
  podeEditar,
}: {
  mensalidades: MensalidadeLinha[];
  onRegistrarPagamento?: (mensalidade: MensalidadeLinha) => void;
  podeEditar?: boolean;
}) {
  const router = useRouter();
  const [estornandoId, setEstornandoId] = useState<string | null>(null);
  const [editando, setEditando] = useState<MensalidadeLinha | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const mostrarAluno = mensalidades.some((m) => m.matricula);
  const colSpan = (mostrarAluno ? 1 : 0) + (onRegistrarPagamento ? 6 : 5);

  async function estornar(pagamentoId: string) {
    if (!confirm("Estornar este pagamento? A mensalidade volta a ficar em aberto.")) return;
    setEstornandoId(pagamentoId);
    const res = await fetch(`/api/financeiro/pagamentos/${pagamentoId}`, { method: "DELETE" });
    setEstornandoId(null);
    if (!res.ok) {
      alert("Não foi possível estornar o pagamento.");
      return;
    }
    // NOVO
    showToast("Pagamento estornado.", "info");
    router.refresh();
  }

  async function salvarEdicao(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editando) return;
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/financeiro/mensalidades/${editando.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        valor: fd.get("valor"),
        vencimento: fd.get("vencimento"),
        descricao: fd.get("descricao") || null,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível salvar.");
      return;
    }

    setEditando(null);
    showToast("Mensalidade atualizada.");
    router.refresh();
  }

  return (
    <>
    <Table>
      <TableHead>
        {mostrarAluno && <Th>Aluno</Th>}
        <Th>Referência</Th>
        <Th>Vencimento</Th>
        <Th>Valor</Th>
        <Th>Situação</Th>
        <Th>Pagamento</Th>
        {onRegistrarPagamento && <Th>Ação</Th>}
      </TableHead>
      <TableBody>
        {mensalidades.length === 0 && (
          <TableEmpty colSpan={colSpan}>Nenhuma mensalidade encontrada.</TableEmpty>
        )}
        {mensalidades.map((m) => {
          const pagamento = m.pagamentos[0];
          const restante = saldoDevedor(m);
          const atrasada = m.situacao === "PENDENTE" && new Date(m.vencimento) < new Date();
          const situacaoExibida = atrasada ? "ATRASADA" : m.situacao;
          const parcial = m.situacao === "PENDENTE" && restante > 0 && restante < m.valor;
          return (
            <Tr key={m.id}>
              {mostrarAluno && (
                <Td>
                  {m.matricula && (
                    <Link
                      href={`/alunos/${m.matricula.aluno.id}`}
                      className="flex items-center gap-2.5 hover:text-cda-blue"
                    >
                      <Avatar nome={m.matricula.aluno.nome} foto={m.matricula.aluno.foto} size="sm" />
                      <span>
                        {m.matricula.aluno.nome}
                        <span className="block text-xs text-cda-text3">{m.matricula.turma.nome}</span>
                      </span>
                    </Link>
                  )}
                </Td>
              )}
              <Td>{m.descricao || `${MESES[m.mes - 1]}/${m.ano}`}</Td>
              <Td>{formatarData(m.vencimento)}</Td>
              <Td>
                <span className="flex items-center gap-1.5">
                  {formatarMoeda(m.valor)}
                  {podeEditar && m.pagamentos.length === 0 && (
                    <button
                      onClick={() => setEditando(m)}
                      title="Editar mensalidade"
                      aria-label="Editar mensalidade"
                      className="text-cda-text3 hover:text-cda-blue"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </span>
                {parcial && (
                  <span className="block text-xs text-cda-amber">saldo: {formatarMoeda(restante)}</span>
                )}
              </Td>
              <Td>
                <Badge variant={SITUACAO_VARIANT[situacaoExibida]}>{SITUACAO_LABEL[situacaoExibida]}</Badge>
              </Td>
              <Td>
                {pagamento ? (
                  <span className="flex items-center gap-1.5">
                    {formatarData(pagamento.dataPagamento)}
                    {onRegistrarPagamento && (
                      <button
                        onClick={() => estornar(pagamento.id)}
                        disabled={estornandoId === pagamento.id}
                        title="Estornar pagamento"
                        aria-label="Estornar pagamento"
                        className="text-cda-text3 hover:text-cda-red disabled:opacity-50"
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </span>
                ) : (
                  "—"
                )}
              </Td>
              {onRegistrarPagamento && (
                <Td>
                  {m.situacao !== "PAGA" && m.situacao !== "CANCELADA" && (
                    <button
                      onClick={() => onRegistrarPagamento(m)}
                      className="text-sm font-medium text-cda-blue hover:underline"
                    >
                      Registrar pagamento
                    </button>
                  )}
                </Td>
              )}
            </Tr>
          );
        })}
      </TableBody>
    </Table>

      <Modal open={!!editando} onClose={() => setEditando(null)} title="Editar mensalidade">
        {editando && (
          <form onSubmit={salvarEdicao} className="flex flex-col gap-4">
            <Input
              label="Descrição (opcional, só pra cobranças avulsas)"
              name="descricao"
              defaultValue={editando.descricao ?? ""}
            />
            <Input label="Valor" name="valor" type="number" step="0.01" min="0.01" required defaultValue={editando.valor} />
            <Input
              label="Vencimento"
              name="vencimento"
              type="date"
              required
              defaultValue={new Date(editando.vencimento).toISOString().slice(0, 10)}
            />
            {error && <p className="text-sm text-cda-red">{error}</p>}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
              <Button type="submit" loading={loading}>
                Salvar
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
