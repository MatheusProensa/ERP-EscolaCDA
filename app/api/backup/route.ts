import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GESTAO } from "@/lib/permissoes";

/** Backup manual sob demanda: exporta todos os dados estruturados do sistema em
 * JSON pra quem tem acesso de gestão baixar e guardar off-site (Drive, etc.).
 * Fica de fora: hash de senha (segurança) e arquivos em base64 — foto de aluno,
 * anexo de chat, contrato assinado, documento de funcionário — que já inflam
 * demais o JSON e são o motivo de existir o backlog de mover isso pra um
 * armazenamento de arquivos de verdade. */
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!GESTAO.includes(session.user.role as (typeof GESTAO)[number])) {
    return NextResponse.json({ error: "Só a direção pode baixar o backup" }, { status: 403 });
  }

  const [
    usuarios,
    anosLetivos,
    turmas,
    listaEspera,
    alunos,
    responsaveis,
    matriculas,
    mensalidades,
    pagamentos,
    contratos,
    funcionarios,
    registrosPonto,
    documentosFuncionario,
    itensEstoque,
    movimentacoesEstoque,
    cardapio,
    chaves,
    emprestimosChave,
    muralAvisos,
    logAtividade,
    eventosCalendario,
    documentosInstitucionais,
    mensagens,
  ] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, createdAt: true } }),
    prisma.anoLetivo.findMany(),
    prisma.turma.findMany(),
    prisma.listaEspera.findMany(),
    prisma.aluno.findMany({ omit: { foto: true } }),
    prisma.responsavel.findMany(),
    prisma.matricula.findMany(),
    prisma.mensalidade.findMany(),
    prisma.pagamento.findMany(),
    prisma.contrato.findMany({ omit: { arquivo: true } }),
    prisma.funcionario.findMany(),
    prisma.registroPonto.findMany(),
    prisma.documentoFuncionario.findMany({ omit: { arquivo: true } }),
    prisma.itemEstoque.findMany(),
    prisma.movimentacaoEstoque.findMany(),
    prisma.cardapio.findMany(),
    prisma.chave.findMany(),
    prisma.emprestimoChave.findMany(),
    prisma.muralAviso.findMany(),
    prisma.logAtividade.findMany(),
    prisma.eventoCalendario.findMany(),
    prisma.documentoInstitucional.findMany(),
    prisma.mensagem.findMany({ omit: { anexo: true } }),
  ]);

  const backup = {
    geradoEm: new Date().toISOString(),
    geradoPor: session.user.name,
    aviso: "Não inclui foto de aluno, anexo de chat, contrato assinado nem documento de funcionário (arquivos em base64).",
    usuarios,
    anosLetivos,
    turmas,
    listaEspera,
    alunos,
    responsaveis,
    matriculas,
    mensalidades,
    pagamentos,
    contratos,
    funcionarios,
    registrosPonto,
    documentosFuncionario,
    itensEstoque,
    movimentacoesEstoque,
    cardapio,
    chaves,
    emprestimosChave,
    muralAvisos,
    logAtividade,
    eventosCalendario,
    documentosInstitucionais,
    mensagens,
  };

  const nomeArquivo = `backup-cda-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(backup), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
    },
  });
}
