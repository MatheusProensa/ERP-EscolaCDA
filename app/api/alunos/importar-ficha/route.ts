import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { validarPlanilhaDataUri } from "@/lib/planilha";
import { parsarFichaMatricula, type ResultadoFicha } from "@/lib/importarFichaMatricula";

type ResultadoArquivo = {
  arquivo: string;
  status: "criado" | "pulado" | "erro";
  motivo?: string;
  alunoId?: string;
  avisos?: string[];
};

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

    const resultados: ResultadoArquivo[] = [];
    let criados = 0;

    for (const { nome: nomeArquivo, dataUri } of arquivos) {
      const validacao = validarPlanilhaDataUri(dataUri);
      if (!validacao.ok) {
        resultados.push({ arquivo: nomeArquivo, status: "erro", motivo: validacao.erro });
        continue;
      }

      let ficha: ResultadoFicha;
      try {
        ficha = await parsarFichaMatricula(validacao.buffer);
      } catch {
        resultados.push({ arquivo: nomeArquivo, status: "erro", motivo: "Não consegui ler esse arquivo como .docx." });
        continue;
      }

      if (!ficha.nome || !ficha.dataNascimento) {
        resultados.push({
          arquivo: nomeArquivo,
          status: "erro",
          motivo: "Faltou nome completo ou data de nascimento do aluno na ficha.",
        });
        continue;
      }

      const existente = ficha.cpf
        ? await prisma.aluno.findUnique({ where: { cpf: ficha.cpf } })
        : await prisma.aluno.findFirst({
            where: { nome: { equals: ficha.nome, mode: "insensitive" }, dataNascimento: new Date(ficha.dataNascimento) },
          });
      if (existente) {
        resultados.push({ arquivo: nomeArquivo, status: "pulado", motivo: `Já existe um aluno cadastrado (${existente.nome}).` });
        continue;
      }

      const avisos = [...ficha.avisos];
      if (ficha.turno && ficha.turno !== turma.turno) {
        avisos.push(`Turno da ficha (${ficha.turno === "TARDE" ? "Tarde" : "Contraturno"}) é diferente do turno da turma escolhida.`);
      }

      const pai = ficha.responsaveis.find((r) => r.parentesco === "Pai");
      const mae = ficha.responsaveis.find((r) => r.parentesco === "Mãe");

      try {
        const aluno = await prisma.$transaction(async (tx) => {
          const novoAluno = await tx.aluno.create({
            data: {
              nome: ficha.nome!,
              dataNascimento: new Date(ficha.dataNascimento!),
              cpf: ficha.cpf || null,
              sexo: ficha.sexo,
              racaCor: ficha.racaCor,
              autorizacaoImagem: ficha.autorizacaoImagem,
              filiacao1: pai?.nome || null,
              filiacao2: mae?.nome || null,
              temIrmaos: ficha.temIrmaos,
              idadesIrmaos: ficha.idadesIrmaos,
              usaBico: ficha.usaBico,
              usaMamadeira: ficha.usaMamadeira,
              jaFrequentouEscola: ficha.jaFrequentouEscola,
              duracaoEscolaAnterior: ficha.duracaoEscolaAnterior,
              rotinaSonoAlimentacao: ficha.rotinaSonoAlimentacao,
              brincadeirasPrediletas: ficha.brincadeirasPrediletas,
              reacoesContrariado: ficha.reacoesContrariado,
              necessidadesEsp: ficha.necessidadesEsp,
              responsaveis: {
                create: ficha.responsaveis.map((r) => ({
                  nome: r.nome,
                  parentesco: r.parentesco,
                  cpf: r.cpf,
                  rg: r.rg,
                  email: r.email,
                  escolaridade: r.escolaridade,
                  profissao: r.profissao,
                  endereco: r.endereco,
                  cep: r.cep,
                  telefoneFixo: r.telefoneFixo,
                  // Responsavel.telefone é obrigatório no schema — cai pro fixo/comercial
                  // se não veio celular, e só em último caso "Não informado".
                  telefone: r.telefone || r.telefoneFixo || r.telefoneComercial || "Não informado",
                  telefoneComercial: r.telefoneComercial,
                  autorizado: r.autorizado,
                })),
              },
              pessoasAutorizadas: {
                create: ficha.pessoasAutorizadas.map((p) => ({ nome: p.nome, parentesco: p.parentesco })),
              },
            },
          });

          await tx.matricula.create({
            data: {
              alunoId: novoAluno.id,
              turmaId,
              anoLetivoId: turma.anoLetivoId,
              situacao: "ATIVA",
              dataMatricula: ficha.dataMatricula ? new Date(ficha.dataMatricula) : new Date(),
            },
          });

          await tx.logAtividade.create({
            data: {
              acao: `Matrícula criada por importação de ficha (${nomeArquivo})`,
              entidade: "Aluno",
              entidadeId: novoAluno.id,
              usuario: session.user.name ?? "Usuário",
            },
          });

          return novoAluno;
        });

        criados++;
        resultados.push({ arquivo: nomeArquivo, status: "criado", alunoId: aluno.id, avisos: avisos.length > 0 ? avisos : undefined });
      } catch (err) {
        resultados.push({ arquivo: nomeArquivo, status: "erro", motivo: err instanceof Error ? err.message : "Erro ao salvar." });
      }
    }

    return NextResponse.json({ criados, total: arquivos.length, resultados });
  } catch (err) {
    return erroApi(err);
  }
}
