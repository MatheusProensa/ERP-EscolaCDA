import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { validarPlanilhaDataUri } from "@/lib/planilha";
import { processarFichaArquivo, type ResultadoImportacaoArquivo } from "@/lib/criarAlunoDaFicha";

/**
 * Importa uma ou mais Fichas de Matrícula (.docx) direto pra um aluno novo —
 * cria o Aluno + Responsáveis (pai/mãe) + Pessoas autorizadas + Matrícula na
 * turma escolhida, sem tela de conferência (decisão do dono do produto: mais
 * rápido pra processar várias fichas de uma vez). Ainda assim confere
 * duplicidade por CPF/nome+nascimento antes de criar, pra não duplicar aluno
 * que já foi importado antes ou já existe no sistema.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const body = await req.json();
    const turmaId: string = body?.turmaId;
    const arquivos: { nome: string; dataUri: string }[] = Array.isArray(body?.arquivos) ? body.arquivos : [];

    if (!turmaId) return NextResponse.json({ error: "Escolha a turma antes de importar." }, { status: 400 });
    if (arquivos.length === 0) return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    if (arquivos.length > 60) return NextResponse.json({ error: "Muitos arquivos de uma vez." }, { status: 400 });

    const turma = await prisma.turma.findUnique({ where: { id: turmaId } });
    if (!turma) return NextResponse.json({ error: "Turma não encontrada." }, { status: 400 });

    const resultados: ResultadoImportacaoArquivo[] = [];
    let criados = 0;

    for (const { nome: nomeArquivo, dataUri } of arquivos) {
      const validacao = validarPlanilhaDataUri(dataUri);
      if (!validacao.ok) {
        resultados.push({ arquivo: nomeArquivo, status: "erro", motivo: validacao.erro });
        continue;
      }

      const resultado = await processarFichaArquivo(
        validacao.buffer,
        nomeArquivo,
        turma,
        session.user.name ?? "Usuário"
      );
      if (resultado.status === "criado") criados++;
      resultados.push(resultado);
    }

    return NextResponse.json({ criados, total: arquivos.length, resultados });
  } catch (err) {
    return erroApi(err);
  }
}
