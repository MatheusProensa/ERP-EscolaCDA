import Link from "next/link";
import { Phone } from "lucide-react";
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

// Alguns telefones importados vieram com texto solto ("Não informado", "-" etc.) em
// vez de um número — sem isso, esses casos viravam link do WhatsApp quebrado.
function telefoneValido(telefone: string): boolean {
  return telefone.replace(/\D/g, "").length >= 10;
}

function ContatoResponsavel({ resp }: { resp: Responsavel }) {
  const valido = telefoneValido(resp.telefone);

  const conteudo = (
    <>
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          valido ? "bg-cda-green/10 text-cda-green" : "bg-cda-bg text-cda-text3"
        }`}
      >
        <Phone className="h-3 w-3" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium leading-tight text-cda-text" title={resp.nome}>
          {resp.nome}
        </span>
        <span className="block text-[11px] leading-tight text-cda-text3">
          {resp.parentesco}
          {valido && <> · {formatarTelefone(resp.telefone)}</>}
        </span>
      </span>
    </>
  );

  if (!valido) {
    return <span className="flex items-center gap-2 py-0.5">{conteudo}</span>;
  }

  return (
    <a
      href={linkWhatsApp(resp.telefone)}
      target="_blank"
      rel="noopener noreferrer"
      title={`Chamar ${resp.nome} no WhatsApp`}
      className="flex items-center gap-2 rounded-md py-0.5 transition-colors hover:bg-cda-green/5"
    >
      {conteudo}
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
        <Th>Responsáveis</Th>
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
                <div className="flex w-64 flex-col gap-1">
                  {resp1 && <ContatoResponsavel resp={resp1} />}
                  {resp2 && <ContatoResponsavel resp={resp2} />}
                  {!resp1 && !resp2 && <span className="text-xs text-cda-text3">Sem responsável cadastrado</span>}
                </div>
              </Td>
            </Tr>
          );
        })}
      </TableBody>
    </Table>
  );
}
