import type { Aluno, Responsavel, PessoaAutorizada, Matricula, Turma, AnoLetivo } from "@prisma/client";
import { turnoDoContrato } from "@/lib/contratoTexto";
import { RACA_COR_LABEL } from "@/lib/censo";
import type { DadosFichaMatricula, DadosResponsavelFicha } from "@/lib/gerarFichaMatriculaPdf";

type AlunoComRelacoes = Aluno & {
  responsaveis: Responsavel[];
  pessoasAutorizadas: PessoaAutorizada[];
  matriculas: (Matricula & { turma: Turma; anoLetivo: AnoLetivo })[];
};

function paraResponsavelFicha(r: Responsavel | undefined): DadosResponsavelFicha {
  if (!r) return null;
  return {
    nome: r.nome,
    rg: r.rg,
    cpf: r.cpf,
    email: r.email,
    escolaridade: r.escolaridade,
    profissao: r.profissao,
    endereco: r.endereco,
    cep: r.cep,
    telefoneFixo: r.telefoneFixo,
    telefoneComercial: r.telefoneComercial,
    telefoneCelular: r.telefone,
  };
}

/** Monta os dados da Ficha de Matrícula direto do que já está salvo no cadastro do
 * aluno — usado tanto para reexportar o PDF sob demanda (sem reabrir o formulário)
 * quanto, depois de salvar, pelo fluxo "editar e gerar de uma vez" do próprio modal. */
export function montarDadosFichaMatricula(
  aluno: AlunoComRelacoes,
  matriculaId?: string,
  turnoLabelOverride?: string
): DadosFichaMatricula {
  const matricula = matriculaId
    ? aluno.matriculas.find((m) => m.id === matriculaId)
    : (aluno.matriculas.find((m) => m.situacao === "ATIVA") ?? aluno.matriculas[0]);

  const pai = aluno.responsaveis.find((r) => r.parentesco.trim().toLowerCase() === "pai");
  const mae = aluno.responsaveis.find((r) => r.parentesco.trim().toLowerCase() === "mãe");

  const obsSaude = [
    aluno.alergias && `Alergias: ${aluno.alergias}`,
    aluno.restricoes && `Restrições alimentares: ${aluno.restricoes}`,
    aluno.medicacaoContinua && `Medicação contínua: ${aluno.medicacaoContinua}`,
    aluno.necessidadesEsp && `Necessidades especiais: ${aluno.necessidadesEsp}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    anoLetivo: matricula?.anoLetivo.ano ?? new Date().getFullYear(),
    dataIngresso: matricula?.dataMatricula ?? new Date(),
    turnoLabel:
      turnoLabelOverride || (matricula ? turnoDoContrato(matricula.turma.nome, matricula.turma.turno) : "Não informado"),
    alunoNome: aluno.nome,
    alunoDataNascimento: aluno.dataNascimento,
    alunoCpf: aluno.cpf,
    sexo: aluno.sexo,
    racaCorLabel: aluno.racaCor ? RACA_COR_LABEL[aluno.racaCor] : null,
    autorizaImagemMarcado: aluno.autorizacaoImagem,
    temIrmaos: aluno.temIrmaos,
    idadesIrmaos: aluno.idadesIrmaos,
    usaBico: aluno.usaBico,
    usaMamadeira: aluno.usaMamadeira,
    obsBicoMamadeira: aluno.obsBicoMamadeira,
    jaFrequentouEscola: aluno.jaFrequentouEscola,
    duracaoEscolaAnterior: aluno.duracaoEscolaAnterior,
    temProblemaSaude: obsSaude.length > 0,
    obsSaude,
    rotinaSonoAlimentacao: aluno.rotinaSonoAlimentacao,
    brincadeirasPrediletas: aluno.brincadeirasPrediletas,
    reacoesContrariado: aluno.reacoesContrariado,
    pai: paraResponsavelFicha(pai),
    mae: paraResponsavelFicha(mae),
    pessoasAutorizadas: aluno.pessoasAutorizadas.map((p) => ({ nome: p.nome, parentesco: p.parentesco })),
  };
}
