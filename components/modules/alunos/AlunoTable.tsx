import Link from "next/link";
import { MessageCircle } from "lucide-react";
import type { Responsavel } from "@prisma/client";
import { Table, TableHead, Th, TableBody, Tr, Td, TableEmpty } from "@/components/ui/Table";
import { Avatar } from "@/components/ui/Avatar";
import { separarResponsaveis } from "@/lib/alunos";
import { formatarData, formatarTelefone, linkWhatsApp } from "@/lib/utils";

export type MatriculaLinha = {
  id: string;
  aluno: { id: string; nome: string; dataNascimento: Date; responsaveis: Responsavel[] };
  turma: { nome: string };
};

function ContatoResponsavel({ resp }: { resp: Responsavel }) {
  return (
    <a
      href={linkWhatsApp(resp.telefone)}
      target="_blank"
      rel="noopener noreferrer"
      title="Chamar no WhatsApp"
      className="flex items-center gap-1 hover:text-cda-green"
      onClick={(e) => e.stopPropagation()}
    >
      <MessageCircle className="h-3 w-3 shrink-0" />
      <span className="truncate">
        {resp.nome} — {formatarTelefone(resp.telefone)}
      </span>
    </a>
  );
}

export function AlunoTable({ matriculas }: { matriculas: MatriculaLinha[] }) {
  return (
    <Table>
      <TableHead>
        <Th>Aluno</Th>
        <Th>Turma</Th>
        <Th>Nascimento</Th>
        <Th>Responsáveis (WhatsApp)</Th>
      </TableHead>
      <TableBody>
        {matriculas.length === 0 && (
          <TableEmpty colSpan={4}>Nenhum aluno encontrado.</TableEmpty>
        )}
        {matriculas.map((m) => {
          const { resp1, resp2 } = separarResponsaveis(m.aluno.responsaveis);
          return (
            <Tr key={m.id}>
              <Td>
                <Link href={`/alunos/${m.aluno.id}`} className="flex items-center gap-2.5 hover:text-cda-blue">
                  <Avatar nome={m.aluno.nome} size="sm" />
                  {m.aluno.nome}
                </Link>
              </Td>
              <Td>{m.turma.nome}</Td>
              <Td>{formatarData(m.aluno.dataNascimento)}</Td>
              <Td>
                <div className="flex max-w-[220px] flex-col gap-0.5 text-xs text-cda-text2">
                  {resp1 && <ContatoResponsavel resp={resp1} />}
                  {resp2 && <ContatoResponsavel resp={resp2} />}
                  {!resp1 && !resp2 && <span className="text-cda-text3">Sem responsável cadastrado</span>}
                </div>
              </Td>
            </Tr>
          );
        })}
      </TableBody>
    </Table>
  );
}
