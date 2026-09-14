import type { TipoDiaPlanejamento } from "@prisma/client";

/** Dias úteis cobertos pelo planejamento semanal — segunda a sexta (achado
 * confirmado, out/2026: planejamento é SEMANAL, dentro de um projeto
 * pedagógico que dura mais que 1 semana). Offset em dias a partir da
 * segunda-feira daquela semana. */
export const OFFSETS_DIA_UTIL = [0, 1, 2, 3, 4] as const;

/** Campos de texto de cada bloco do dia — as chaves usadas variam conforme
 * `tipo` (ver TipoDiaPlanejamento no schema), copiadas do documento real
 * MODELO_PLANEJAMENTO_CDA (achado real, set/2026):
 * - TEMATICA: tematicaDia + momentoInicial/Fundamental (+ perguntas de cada).
 * - CONTEXTO: contextoOrganizado + rodaDeConversa/organizacaoContexto (+
 *   perguntas de cada).
 * - momentoFinal/questionamentosFinal são comuns aos 2 tipos (registro do
 *   dia — no documento real só se aplica a partir de certa idade, a
 *   professora deixa em branco quando não se aplica à turma dela). */
export type ConteudoDiaPlanejamento = {
  tematicaDia?: string;
  momentoInicial?: string;
  questionamentosInicial?: string;
  momentoFundamental?: string;
  questionamentosFundamental?: string;
  contextoOrganizado?: string;
  rodaDeConversa?: string;
  questionamentosRoda?: string;
  organizacaoContexto?: string;
  questionamentosContexto?: string;
  momentoFinal?: string;
  questionamentosFinal?: string;
};

/** Tipo padrão de cada dia útil da semana, pelo índice (0=segunda...4=sexta)
 * — alternado TEMATICA/CONTEXTO igual o padrão real observado no documento
 * (segunda/quarta/sexta = temática, terça/quinta = contexto). É só o valor
 * sugerido pra um dia ainda não preenchido; a professora pode trocar. */
export function tipoPadraoDoDia(indice: number): TipoDiaPlanejamento {
  return indice % 2 === 0 ? "TEMATICA" : "CONTEXTO";
}

/** Segunda-feira (meia-noite UTC) da semana que contém `data` — identidade
 * do Planejamento é (turma, semanaInicio), sempre normalizada pra segunda,
 * independente de qual dia da semana alguém abriu a tela. Mesma convenção de
 * data pura (meia-noite UTC) usada em EventoCalendario/AnoLetivo. */
export function segundaFeiraDe(data: Date): Date {
  const diaSemana = data.getUTCDay(); // 0=Dom, 1=Seg, ..., 6=Sáb
  const deslocamento = diaSemana === 0 ? -6 : 1 - diaSemana;
  const segunda = new Date(data);
  segunda.setUTCDate(segunda.getUTCDate() + deslocamento);
  return segunda;
}

/** As 5 datas (segunda a sexta) da semana que começa em `segunda`. */
export function diasDaSemana(segunda: Date): Date[] {
  return OFFSETS_DIA_UTIL.map((offset) => {
    const d = new Date(segunda);
    d.setUTCDate(d.getUTCDate() + offset);
    return d;
  });
}

/** "YYYY-MM-DD" em UTC — chave estável de dia pra usar em query string e
 * comparar datas sem depender de fuso horário do navegador. */
export function isoData(data: Date): string {
  return data.toISOString().slice(0, 10);
}
