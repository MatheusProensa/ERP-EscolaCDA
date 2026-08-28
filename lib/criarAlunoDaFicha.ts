import { prisma } from "@/lib/prisma";
import { parsarFichaMatricula, type ResultadoFicha } from "@/lib/importarFichaMatricula";

export type ResultadoImportacaoArquivo = {
  arquivo: string;
  status: "criado" | "pulado" | "erro";
  motivo?: string;
  alunoId?: string;
  avisos?: string[];
};

/**
 * Processa UM arquivo de Ficha de Matrícula já lido em buffer: faz o parse,
 * confere duplicidade (CPF ou nome+nascimento) e cria Aluno + Responsáveis +
 * Pessoas autorizadas + Matrícula na turma informada. Sem tela de
 * conferência (decisão do dono do produto) — usado tanto pela rota
 * /api/alunos/importar-ficha (upload manual) quanto por scripts de
 * importação em lote (pasta cheia de fichas do pai do Matheus).
 */
export async function processarFichaArquivo(
  buffer: Buffer,
  nomeArquivo: string,
  turma: { id: string; turno: string; anoLetivoId: string },
  usuario: string
): Promise<ResultadoImportacaoArquivo> {
  let ficha: ResultadoFicha;
  try {
    ficha = await parsarFichaMatricula(buffer);
  } catch {
    return { arquivo: nomeArquivo, status: "erro", motivo: "Não consegui ler esse arquivo como .docx." };
  }

  if (!ficha.nome || !ficha.dataNascimento) {
    return { arquivo: nomeArquivo, status: "erro", motivo: "Faltou nome completo ou data de nascimento do aluno na ficha." };
  }

  const existente = ficha.cpf
    ? await prisma.aluno.findUnique({ where: { cpf: ficha.cpf } })
    : await prisma.aluno.findFirst({
        where: { nome: { equals: ficha.nome, mode: "insensitive" }, dataNascimento: new Date(ficha.dataNascimento) },
      });
  if (existente) {
    return { arquivo: nomeArquivo, status: "pulado", motivo: `Já existe um aluno cadastrado (${existente.nome}).` };
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
          turmaId: turma.id,
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
          usuario,
        },
      });

      return novoAluno;
    });

    return { arquivo: nomeArquivo, status: "criado", alunoId: aluno.id, avisos: avisos.length > 0 ? avisos : undefined };
  } catch (err) {
    return { arquivo: nomeArquivo, status: "erro", motivo: err instanceof Error ? err.message : "Erro ao salvar." };
  }
}
