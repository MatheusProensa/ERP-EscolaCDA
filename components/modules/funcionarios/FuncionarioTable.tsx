"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import type { Funcionario } from "@prisma/client";
import { Table, TableHead, Th, ThActions, TableBody, Tr, Td, TdActions, TableEmpty } from "@/components/ui/Table";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { showToast } from "@/components/ui/Toast";
import { formatarData, formatarTelefone } from "@/lib/utils";

function pendenciasDe(f: Funcionario): string[] {
  const pendencias: string[] = [];
  if (f.participaPonto && f.jornadaPrevistaMinutos == null) {
    pendencias.push("Sem jornada prevista definida — o Ponto não vai calcular horas extra/atraso corretamente");
  }
  if (!f.telefone) pendencias.push("Sem telefone cadastrado");
  if (!f.dataNascimento) pendencias.push("Sem data de nascimento cadastrada");
  return pendencias;
}

export function FuncionarioTable({
  funcionarios,
  mostrarSetor = true,
  podeEditar = true,
}: {
  funcionarios: Funcionario[];
  mostrarSetor?: boolean;
  /** Achado real (set/2026): as ações de editar/desativar/excluir apareciam
   * pra qualquer um que enxergasse /funcionarios, mesmo com "Só visualizar"
   * marcado na grade. Default true só pra não quebrar quem já chama esse
   * componente sem passar a prop — todo chamador atual já passa de verdade. */
  podeEditar?: boolean;
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<Funcionario | null>(null);

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

  if (funcionarios.length === 0) {
    return (
      <Table>
        <TableHead>
          <Th>Nome</Th>
          <Th>Cargo</Th>
          {mostrarSetor && <Th>Setor</Th>}
          <Th>Telefone</Th>
          <Th>Admissão</Th>
          {podeEditar && <ThActions />}
        </TableHead>
        <TableBody>
          <TableEmpty colSpan={(mostrarSetor ? 5 : 4) + (podeEditar ? 1 : 0)}>Nenhum funcionário encontrado.</TableEmpty>
        </TableBody>
      </Table>
    );
  }

  return (
    <>
      {/* Celular: cartão com nome em destaque + "rótulo: valor" pros campos
          secundários (mesmo desenho do ListaPessoas de referência do Claude
          Design) — mesma razão de sempre, 5-6 colunas não cabem legíveis numa
          tela estreita. */}
      <div className="divide-y divide-cda-border sm:hidden">
        {funcionarios.map((f) => {
          const pendencias = pendenciasDe(f);
          return (
            <div key={f.id} className="flex items-start gap-3 p-4">
              <Link href={`/funcionarios/${f.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <Avatar nome={f.nome} size="sm" />
                  <span className="font-medium text-cda-text">{f.nome}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-cda-text3">
                  <span>
                    Cargo: <span className="text-cda-text2">{f.cargo}</span>
                  </span>
                  {mostrarSetor && (
                    <span>
                      Setor: <span className="text-cda-text2">{f.setor}</span>
                    </span>
                  )}
                  <span>
                    Tel.: <span className="text-cda-text2">{f.telefone ? formatarTelefone(f.telefone) : "—"}</span>
                  </span>
                  <span>
                    Admissão: <span className="text-cda-text2">{formatarData(f.admissao)}</span>
                  </span>
                </div>
                {pendencias.length > 0 && (
                  <span title={pendencias.join(" · ")} className="mt-1.5 inline-block">
                    <Badge variant="warning">
                      {pendencias.length} pendência{pendencias.length === 1 ? "" : "s"}
                    </Badge>
                  </span>
                )}
              </Link>
              {podeEditar && (
                <div className="flex shrink-0 items-center gap-1">
                  <IconButton icon={Pencil} label="Editar funcionário" size="sm" href={`/funcionarios/${f.id}/editar`} />
                  <IconButton
                    icon={Trash2}
                    label="Excluir funcionário de vez"
                    size="sm"
                    variant="danger"
                    disabled={loadingId === f.id}
                    onClick={() => setExcluindo(f)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Computador: tabela normal */}
      <Table className="hidden sm:table">
        <TableHead>
          <Th>Nome</Th>
          <Th>Cargo</Th>
          {mostrarSetor && <Th>Setor</Th>}
          <Th>Telefone</Th>
          <Th>Admissão</Th>
          {podeEditar && <ThActions />}
        </TableHead>
        <TableBody>
          {funcionarios.map((f) => {
            const pendencias = pendenciasDe(f);
            return (
              <Tr key={f.id}>
                <Td>
                  <Link href={`/funcionarios/${f.id}`} className="flex items-center gap-2.5 hover:text-cda-blue">
                    <Avatar nome={f.nome} size="sm" />
                    {f.nome}
                  </Link>
                  {/* Etapa 4.5 do handoff: o motivo agora fica visível num badge, em vez de
                      escondido atrás de um alert() que ninguém sabia que existia.
                      Achado de auditoria externa (set/2026): com só 1 pendência, o badge
                      estampava a frase inteira (até 90 caracteres) dentro de uma pílula,
                      quebrando linha e deixando de parecer badge — agora sempre mostra a
                      contagem, frase completa só no title (tooltip). */}
                  {pendencias.length > 0 && (
                    <span title={pendencias.join(" · ")} className="mt-1 inline-block">
                      <Badge variant="warning">
                        {pendencias.length} pendência{pendencias.length === 1 ? "" : "s"}
                      </Badge>
                    </span>
                  )}
                </Td>
                <Td>{f.cargo}</Td>
                {mostrarSetor && <Td>{f.setor}</Td>}
                <Td>{f.telefone ? formatarTelefone(f.telefone) : "—"}</Td>
                <Td>{formatarData(f.admissao)}</Td>
                {podeEditar && (
                  <TdActions>
                    <IconButton icon={Pencil} label="Editar funcionário" size="sm" href={`/funcionarios/${f.id}/editar`} />
                    <IconButton
                      icon={Trash2}
                      label="Excluir funcionário de vez"
                      size="sm"
                      variant="danger"
                      disabled={loadingId === f.id}
                      onClick={() => setExcluindo(f)}
                    />
                  </TdActions>
                )}
              </Tr>
            );
          })}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={excluindo !== null}
        onClose={() => setExcluindo(null)}
        onConfirm={() => excluindo && excluir(excluindo)}
        title={`Excluir ${excluindo?.nome ?? ""} de vez?`}
        consequence="Isso apaga também o histórico de ponto e os documentos anexados dele — não dá pra desfazer."
        confirmLabel="Excluir de vez"
        loading={loadingId === excluindo?.id}
      />
    </>
  );
}
