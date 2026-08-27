import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gerarContratoPdf } from "@/lib/gerarContratoPdf";

// Rota PÚBLICA (sem auth) — é o que o responsável acessa pelo link de
// assinatura, ver proxy.ts pra a exceção de autenticação. Só aceita o POST
// com o token certo; não vaza nada além do que o próprio link já revela.
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json().catch(() => ({}));
  const { nome, cpf, concordo } = body;

  if (!nome || typeof nome !== "string" || nome.trim().length < 3) {
    return NextResponse.json({ error: "Informe seu nome completo" }, { status: 400 });
  }
  if (!concordo) {
    return NextResponse.json({ error: "Confirme que leu e concorda com os termos" }, { status: 400 });
  }

  const contrato = await prisma.contrato.findUnique({ where: { tokenAssinatura: token } });
  if (!contrato) return NextResponse.json({ error: "Link inválido" }, { status: 404 });
  if (contrato.assinado) return NextResponse.json({ error: "Esse contrato já foi assinado" }, { status: 400 });
  if (!contrato.alunoNomeSnapshot || !contrato.alunoNascimentoSnapshot || !contrato.dataMatriculaSnapshot) {
    return NextResponse.json({ error: "Contrato sem dados suficientes — peça pra secretaria gerar de novo" }, { status: 400 });
  }

  const agora = new Date();
  // Em produção (Vercel) o IP real vem em x-forwarded-for; em dev local não existe.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const arquivo = await gerarContratoPdf({
    alunoNome: contrato.alunoNomeSnapshot,
    alunoDataNascimento: contrato.alunoNascimentoSnapshot,
    responsavelNome: contrato.responsavelNomeSnapshot ?? "Não informado",
    responsavelCpf: contrato.responsavelCpfSnapshot,
    turmaNome: contrato.turmaNomeSnapshot ?? "",
    turnoLabel: (contrato.turnoLabelSnapshot as "Tarde" | "Integral" | "Contraturno") ?? "Tarde",
    anoLetivo: contrato.anoLetivoSnapshot ?? agora.getFullYear(),
    valorMensalidade: contrato.valorMensalidadeSnapshot ?? 0,
    dataMatricula: contrato.dataMatriculaSnapshot,
    diaVencimento: contrato.diaVencimentoSnapshot ?? "",
    mesInicioVencimento: contrato.mesInicioVencimentoSnapshot ?? "",
    assinatura: { nome: nome.trim(), cpf: cpf?.trim() || null, dataHora: agora },
  });

  const atualizado = await prisma.contrato.update({
    where: { id: contrato.id },
    data: {
      arquivo,
      assinado: true,
      assinadoEm: agora,
      nomeAssinante: nome.trim(),
      cpfAssinante: cpf?.trim() || null,
      ipAssinatura: ip,
    },
  });

  await prisma.logAtividade.create({
    data: {
      acao: `Contrato assinado pelo link - ${contrato.alunoNomeSnapshot} (assinado por ${nome.trim()})`,
      entidade: "Contrato",
      entidadeId: contrato.id,
      usuario: "Responsável (link público)",
    },
  });

  return NextResponse.json(atualizado);
}
