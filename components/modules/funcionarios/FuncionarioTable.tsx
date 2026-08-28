"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, UserX, UserCheck, Trash2 } from "lucide-react";
import type { Funcionario } from "@prisma/client";
import { Table, TableHead, Th, ThActions, TableBody, Tr, Td, TdActions, TableEmpty } from "@/components/ui/Table";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { showToast } from "@/components/ui/Toast";
import { formatarData, formatarTelefone } from "@/lib/utils";

export function FuncionarioTable({
  funcionarios,
  mostrarSetor = true,
}: {
  funcionarios: Funcionario[];
  mostrarSetor?: boolean;
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [desativando, setDesativando] = useState<Funcionario | null>(null);
  const [excluindo, setExcluindo] = useState<Funcionario | null>(null);

  async function alternarAtivo(f: Funcionario) {
    setLoadingId(f.id);
    await fetch(`/api/funcionarios/${f.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !f.ativo }),
    });
    setLoadingId(null);
    setDesativando(null);
    router.refresh();
  }

  async function excluir(f: Funcionario) {
    setLoadingId(f.id);
    const res = await fetch(`/api/funcionarios/${f.id}`, { method: "DELETE" });
    setLoadingId(null);
    if (!res.ok) {
      showToast("Não foi possível excluir o funcionário.", "error");
      return;
    }
    setExcluindo(null);
    router.refresh();
  }

  return (
    <Table>
      <TableHead>
        <Th>Nome</Th>
        <Th>Cargo</Th>
        {mostrarSetor && <Th>Setor</Th>}
        <Th>Telefone</Th>
        <Th>Admissão</Th>
        <Th>Situação</Th>
        <ThActions />
      </TableHead>
      <TableBody>
        {funcionarios.length === 0 && (
          <TableEmpty colSpan={mostrarSetor ? 7 : 6}>Nenhum funcionário encontrado.</TableEmpty>
        )}
        {funcionarios.map((f) => {
          const pendencias: string[] = [];
          if (f.ativo && f.participaPonto && f.jornadaPrevistaMinutos == null) {
            pendencias.push("Sem jornada prevista definida — o Ponto não vai calcular horas extra/atraso corretamente");
          }
          if (!f.telefone) pendencias.push("Sem telefone cadastrado");
          if (!f.dataNascimento) pendencias.push("Sem data de nascimento cadastrada");
          return (
          <Tr key={f.id}>
            <Td>
              <Link href={`/funcionarios/${f.id}`} className="flex items-center gap-2.5 hover:text-cda-blue">
                <Avatar nome={f.nome} size="sm" />
                {f.nome}
              </Link>
              {/* Etapa 4.5 do handoff: o motivo agora fica visível num badge, em vez de
                  escondido atrás de um alert() que ninguém sabia que existia. */}
              {pendencias.length > 0 && (
                <span title={pendencias.join(" · ")} className="mt-1 inline-block">
                  <Badge variant="warning">
                    {pendencias.length === 1 ? pendencias[0] : `${pendencias.length} pendências de cadastro`}
                  </Badge>
                </span>
              )}
            </Td>
            <Td>{f.cargo}</Td>
            {mostrarSetor && <Td>{f.setor}</Td>}
            <Td>{f.telefone ? formatarTelefone(f.telefone) : "—"}</Td>
            <Td>{formatarData(f.admissao)}</Td>
            <Td>
              <Badge variant={f.ativo ? "green" : "gray"}>{f.ativo ? "Ativo" : "Inativo"}</Badge>
            </Td>
            <TdActions>
              <IconButton icon={Pencil} label="Editar funcionário" size="sm" href={`/funcionarios/${f.id}/editar`} />
              <IconButton
                icon={f.ativo ? UserX : UserCheck}
                label={f.ativo ? "Desativar funcionário" : "Reativar funcionário"}
                size="sm"
                variant={f.ativo ? "danger" : "neutral"}
                disabled={loadingId === f.id}
                onClick={() => (f.ativo ? setDesativando(f) : alternarAtivo(f))}
              />
              <IconButton
                icon={Trash2}
                label="Excluir funcionário de vez"
                size="sm"
                variant="danger"
                disabled={loadingId === f.id}
                onClick={() => setExcluindo(f)}
              />
            </TdActions>
          </Tr>
          );
        })}
      </TableBody>

      <ConfirmDialog
        open={desativando !== null}
        onClose={() => setDesativando(null)}
        onConfirm={() => desativando && alternarAtivo(desativando)}
        title={`Desativar ${desativando?.nome ?? ""}?`}
        confirmLabel="Desativar"
        loading={loadingId === desativando?.id}
      />

      <ConfirmDialog
        open={excluindo !== null}
        onClose={() => setExcluindo(null)}
        onConfirm={() => excluindo && excluir(excluindo)}
        title={`Excluir ${excluindo?.nome ?? ""} de vez?`}
        consequence="Isso apaga também o histórico de ponto e os documentos anexados dele — não dá pra desfazer."
        confirmLabel="Excluir de vez"
        secondaryAction={excluindo ? { label: "Desativar", onClick: () => { setExcluindo(null); setDesativando(excluindo); } } : undefined}
        loading={loadingId === excluindo?.id}
      />
    </Table>
  );
}
