import { LMS_IMC_MENINOS, LMS_IMC_MENINAS } from "@/lib/oms-imc-lms-data";

/** As 4 faixas que a Nutricionista já usa (mesma classificação vista no
 * sistema da outra escola, set/2026) — versão simplificada do SISVAN/
 * Ministério da Saúde pra crianças até 5 anos incompletos: corta em
 * percentil 3 e percentil 97 do IMC-por-idade da OMS. (O SISVAN oficial tem
 * 6 faixas — magreza acentuada/risco de sobrepeso/obesidade grave à parte —
 * mas essas 4 foram o que a referência mostrou; dá pra desdobrar depois se
 * fizer falta.) */
export type ClassificacaoImc = "BAIXO" | "EUTROFICO" | "SOBREPESO" | "OBESIDADE";

export const CLASSIFICACAO_LABEL: Record<ClassificacaoImc, string> = {
  BAIXO: "Baixo IMC para idade",
  EUTROFICO: "IMC adequado (Eutrófico)",
  SOBREPESO: "Sobrepeso",
  OBESIDADE: "Obesidade",
};

/** Idade em dias completos entre nascimento e a data da avaliação — a tabela
 * da OMS é indexada por dia de vida (0 a 1826 = 0 a 5 anos), não por mês, pra
 * não perder precisão arredondando. */
export function idadeEmDiasCompletos(dataNascimento: Date, dataReferencia: Date): number {
  const ms = dataReferencia.getTime() - dataNascimento.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/** "2 anos e 3 meses" / "8 meses" — pra mostrar ao lado do nome do aluno e de
 * cada avaliação (idade que ele tinha NAQUELE dia, não a idade de hoje).
 * getUTC* (não getFullYear/getMonth locais): dataNascimento é uma data pura
 * (meia-noite UTC, como todo outro campo de "dia" do sistema — ver
 * hojeBrasilia() em lib/utils.ts) — misturar getters locais e UTC pode
 * deslocar o resultado em 1 dia perto da virada do mês. */
export function formatarIdade(dataNascimento: Date, dataReferencia: Date): string {
  let anos = dataReferencia.getUTCFullYear() - dataNascimento.getUTCFullYear();
  let meses = dataReferencia.getUTCMonth() - dataNascimento.getUTCMonth();
  if (dataReferencia.getUTCDate() < dataNascimento.getUTCDate()) meses -= 1;
  if (meses < 0) {
    anos -= 1;
    meses += 12;
  }
  if (anos <= 0) return `${meses} ${meses === 1 ? "mês" : "meses"}`;
  return `${anos} ${anos === 1 ? "ano" : "anos"} e ${meses} ${meses === 1 ? "mês" : "meses"}`;
}

export function calcularImc(pesoKg: number, alturaCm: number): number {
  const alturaM = alturaCm / 100;
  return pesoKg / (alturaM * alturaM);
}

/** Z-score pelo método LMS (Cole), o mesmo que a OMS usa pra publicar as
 * curvas de crescimento. Fórmula oficial: com L≈0 (raro, mas acontece nas
 * tabelas da OMS pra outros índices) cai pro caso limite log-normal. */
function zScoreLms(valor: number, l: number, m: number, s: number): number {
  if (Math.abs(l) < 1e-6) return Math.log(valor / m) / s;
  return (Math.pow(valor / m, l) - 1) / (l * s);
}

/** Percentil (0-100) a partir do z-score, via aproximação numérica padrão
 * da função erro (Abramowitz & Stegun 7.1.26 — precisão de ~1.5e-7, de sobra
 * pra uso clínico). Não é fórmula nossa: é a aproximação clássica de
 * cálculo de CDF normal, usada em praticamente toda calculadora de percentil
 * de crescimento infantil por aí. */
function zParaPercentil(z: number): number {
  const sinal = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  const cdf = 0.5 * (1 + sinal * y);
  return cdf * 100;
}

function classificar(percentil: number): ClassificacaoImc {
  if (percentil < 3) return "BAIXO";
  if (percentil <= 85) return "EUTROFICO";
  if (percentil <= 97) return "SOBREPESO";
  return "OBESIDADE";
}

export type ResultadoAvaliacaoImc = {
  imc: number;
  idadeDias: number;
  /** true quando a idade na data da avaliação passa dos 5 anos (1826 dias) —
   * fora do alcance da tabela da OMS que temos hoje (ela só cobre 0-5 anos,
   * que é a faixa recomendada pelo Ministério da Saúde pra essa idade e
   * cobre o público da escola). Nesse caso usamos o último dia da tabela
   * como aproximação e avisamos na tela, em vez de travar a avaliação. */
  foraDaFaixaEtaria: boolean;
  zScore: number;
  percentil: number;
  classificacao: ClassificacaoImc;
};

/** Ponto de entrada único — pega peso/altura/nascimento/sexo/data da
 * avaliação e devolve o IMC já classificado pela curva oficial da OMS. */
export function avaliarImcPorIdade({
  sexo,
  dataNascimento,
  dataAvaliacao,
  pesoKg,
  alturaCm,
}: {
  sexo: "M" | "F";
  dataNascimento: Date;
  dataAvaliacao: Date;
  pesoKg: number;
  alturaCm: number;
}): ResultadoAvaliacaoImc {
  const tabela = sexo === "M" ? LMS_IMC_MENINOS : LMS_IMC_MENINAS;
  const idadeDias = idadeEmDiasCompletos(dataNascimento, dataAvaliacao);
  const foraDaFaixaEtaria = idadeDias < 0 || idadeDias > tabela.length - 1;
  const indice = Math.min(Math.max(idadeDias, 0), tabela.length - 1);
  const [l, m, s] = tabela[indice];

  const imc = calcularImc(pesoKg, alturaCm);
  const zScore = zScoreLms(imc, l, m, s);
  const percentil = Math.min(100, Math.max(0, zParaPercentil(zScore)));

  return { imc, idadeDias, foraDaFaixaEtaria, zScore, percentil, classificacao: classificar(percentil) };
}
