"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Pencil, UserX, UserCheck } from "lucide-react";
import type { Funcionario } from "@prisma/client";
import { Table, TableHead, Th, TableBody, Tr, Td, TableEmpty } from "@/components/ui/Table";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
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

  async function alternarAtivo(f: Funcionario) {
    if (f.ativo && !confirm(`Desativar ${f.nome}?`)) return;
    setLoadingId(f.id);
    await fetch(`/api/funcionarios/${f.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !f.ativo }),
    });
    setLoadingId(null);
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
        <Th>{""}</Th>
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
                {pendencias.length > 0 && (
                  <span title={pendencias.join(" · ")}>
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-cda-amber" />
                  </span>
                )}
              </Link>
            </Td>
            <Td>{f.cargo}</Td>
            {mostrarSetor && <Td>{f.setor}</Td>}
            <Td>{f.telefone ? formatarTelefone(f.telefone) : "—"}</Td>
            <Td>{formatarData(f.admissao)}</Td>
            <Td>
              <Badge variant={f.ativo ? "green" : "gray"}>{f.ativo ? "Ativo" : "Inativo"}</Badge>
            </Td>
            <Td>
              <div className="flex items-center gap-3">
                <Link
                  href={`/funcionarios/${f.id}/editar`}
                  title="Editar"
                  className="text-cda-text3 hover:text-cda-blue"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => alternarAtivo(f)}
                  disabled={loadingId === f.id}
                  title={f.ativo ? "Desativar (saiu da escola)" : "Reativar"}
                  className="text-cda-text3 hover:text-cda-red disabled:opacity-50"
                >
                  {f.ativo ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                </button>
              </div>
            </Td>
          </Tr>
          );
        })}
      </TableBody>
    </Table>
  );
}
