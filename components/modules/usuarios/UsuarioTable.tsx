import Link from "next/link";
import { KeyRound } from "lucide-react";
import { Table, TableHead, Th, TableBody, Tr, Td, TableEmpty } from "@/components/ui/Table";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ROLE_LABEL, ROLE_BADGE_VARIANT } from "@/lib/permissoes";
import { formatarData } from "@/lib/utils";

export type UsuarioTableDados = {
  id: string;
  name: string;
  email: string;
  role: string;
  foto?: string | null;
  createdAt: string | Date;
  pedidoResetSenhaEm?: string | Date | null;
  vinculosPedagogico: { papel: "REGENTE" | "ESPECIALISTA"; materia: string | null; turma: { nome: string } }[];
};

/** Resumo do vínculo pedagógico (achado real, set/2026: o dono vai cadastrar
 * várias professoras como regente de uma vez — precisa ver de cara quem já
 * tem turma e quem falta vincular, sem abrir 1 por 1). REGENTE mostra só o
 * nome da turma; ESPECIALISTA mostra turma + matéria, uma pílula por turma. */
function VinculoResumo({ vinculos }: { vinculos: UsuarioTableDados["vinculosPedagogico"] }) {
  if (vinculos.length === 0) return <span className="text-cda-text3">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {vinculos.map((v, i) => (
        <Badge key={i} variant={v.papel === "REGENTE" ? "cat1" : "cat5"}>
          {v.turma.nome}
          {v.papel === "ESPECIALISTA" && v.materia ? ` · ${v.materia}` : ""}
        </Badge>
      ))}
    </div>
  );
}

/** Listagem de usuários em tabela — trocou o grid de cards (achado real, dono,
 * set/2026: "vai ter muitos funcionários... tá muito poluído" ao ver o grid
 * de cards antes de cadastrar várias professoras de uma vez) pelo mesmo
 * padrão já usado em Funcionários/Alunos: 1 tabela densa, fácil de escanear
 * muita gente de uma vez, com a coluna Turma dando o contexto pedagógico que
 * o card não mostrava. */
export function UsuarioTable({ usuarios, meuId }: { usuarios: UsuarioTableDados[]; meuId?: string }) {
  if (usuarios.length === 0) {
    return (
      <Table>
        <TableHead>
          <Th>Nome</Th>
          <Th>Cargo</Th>
          <Th>Turma</Th>
          <Th>Desde</Th>
        </TableHead>
        <TableBody>
          <TableEmpty colSpan={4}>Nenhum usuário encontrado.</TableEmpty>
        </TableBody>
      </Table>
    );
  }

  return (
    <>
      {/* Celular: cartão com nome em destaque, mesmo desenho do FuncionarioTable */}
      <div className="divide-y divide-cda-border sm:hidden">
        {usuarios.map((u) => (
          <Link key={u.id} href={`/usuarios/${u.id}`} className="flex items-start gap-3 p-4">
            <Avatar nome={u.name} foto={u.foto} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 font-medium text-cda-text">
                <span className="truncate">{u.name}</span>
                {u.id === meuId && <span className="shrink-0 font-normal text-cda-text3">(você)</span>}
                {u.pedidoResetSenhaEm && (
                  <span title="Pediu redefinição de senha">
                    <KeyRound className="h-3.5 w-3.5 shrink-0 text-cda-amber" />
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-cda-text3">{u.email}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge variant={ROLE_BADGE_VARIANT[u.role] ?? "neutral"}>{ROLE_LABEL[u.role] ?? u.role}</Badge>
                <VinculoResumo vinculos={u.vinculosPedagogico} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Computador: tabela normal */}
      <Table className="hidden sm:table">
        <TableHead>
          <Th>Nome</Th>
          <Th>Cargo</Th>
          <Th>Turma</Th>
          <Th>Desde</Th>
        </TableHead>
        <TableBody>
          {usuarios.map((u) => (
            <Tr key={u.id}>
              <Td>
                <Link href={`/usuarios/${u.id}`} className="flex items-center gap-2.5 hover:text-cda-blue">
                  <Avatar nome={u.name} foto={u.foto} size="sm" />
                  <div className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      {u.name}
                      {u.id === meuId && <span className="text-xs font-normal text-cda-text3">(você)</span>}
                      {u.pedidoResetSenhaEm && (
                        <span title="Pediu redefinição de senha">
                          <KeyRound className="h-3.5 w-3.5 shrink-0 text-cda-amber" />
                        </span>
                      )}
                    </span>
                    <p className="text-xs text-cda-text3">{u.email}</p>
                  </div>
                </Link>
              </Td>
              <Td>
                <Badge variant={ROLE_BADGE_VARIANT[u.role] ?? "neutral"}>{ROLE_LABEL[u.role] ?? u.role}</Badge>
              </Td>
              <Td>
                <VinculoResumo vinculos={u.vinculosPedagogico} />
              </Td>
              <Td>{formatarData(u.createdAt)}</Td>
            </Tr>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
