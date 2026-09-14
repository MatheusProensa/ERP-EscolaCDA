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
 *   professora deixa em branco quando não se aplica à turma dela).
 * - folhaTemaLiterario/folhaAtividadeGrafica: texto das folhas imprimíveis
 *   pontuais (achado real: docs MODELO_TEMA_LITERÁRIO/ATIVIDADE_GRÁFICA —
 *   uma folha "NOME/DATA" + instrução + espaço em branco pro desenho, pra
 *   mandar pra casa ou preencher na sala num dia específico). Opcional, só
 *   preenche quando aquele dia realmente tem uma dessas folhas. */
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
  folhaTemaLiterario?: string;
  folhaAtividadeGrafica?: string;
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

/** Todas as segundas-feiras cujas semanas tocam o mês de `data` — é o que
 * define "entregue esse mês": a professora entrega semana a semana (achado
 * real: o documento é organizado por semana dentro do mês/projeto), mas a
 * COBRANÇA da coordenadora é mensal (correção do dono, set/2026: "planejamento
 * é por mês", repetida depois de ver o card "Entregaram essa semana" no ar —
 * a semana é só a unidade de preenchimento, não a unidade de cobrança).
 * Inclui a semana que já começa no mês anterior quando a 1ª segunda do mês
 * cai depois do dia 1 (a semana inteira "pertence" ao mês que ela cobre). */
export function semanasDoMes(data: Date): Date[] {
  const primeiroDia = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), 1));
  const ultimoDia = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth() + 1, 0));
  const semanas: Date[] = [];
  let segunda = segundaFeiraDe(primeiroDia);
  while (segunda <= ultimoDia) {
    semanas.push(new Date(segunda));
    segunda = new Date(segunda);
    segunda.setUTCDate(segunda.getUTCDate() + 7);
  }
  return semanas;
}

/** Título do dia (o que aparece em destaque no Roteiro) — tematicaDia pro
 * tipo TEMATICA, contextoOrganizado pro tipo CONTEXTO. */
export function tituloDoDia(tipo: TipoDiaPlanejamento, conteudo: ConteudoDiaPlanejamento): string {
  return (tipo === "TEMATICA" ? conteudo.tematicaDia : conteudo.contextoOrganizado) ?? "";
}

/** Roteiro é a versão resumida do planejamento (achado real, set/2026:
 * documento MODELO_ROTEIRO_CDA — mesma semana, só que em bullets curtos em
 * vez dos parágrafos completos) — GERADO a partir do planejamento em vez de
 * digitado de novo (senão a professora escreveria a mesma coisa 2x). Cada
 * bloco de texto já preenchido vira 1 bullet, na ordem em que aparecem no
 * formulário; o momento final (registro) entra por último, comum aos 2 tipos. */
export function bulletsDoDia(tipo: TipoDiaPlanejamento, conteudo: ConteudoDiaPlanejamento): string[] {
  const bullets =
    tipo === "TEMATICA"
      ? [conteudo.momentoInicial, conteudo.momentoFundamental]
      : [conteudo.rodaDeConversa, conteudo.organizacaoContexto];
  return [...bullets, conteudo.momentoFinal].filter((texto): texto is string => !!texto);
}

/** Versão completa (rótulo + parágrafo inteiro, não em bullet) de cada bloco
 * preenchido do dia, na mesma ordem do formulário — usada pra exportar o
 * planejamento em PDF (achado real, set/2026: mesma estrutura do documento
 * MODELO_PLANEJAMENTO_CDA, um bloco "PERGUNTA:" logo abaixo de cada
 * momento/contexto). Só entra bloco que tem algo escrito. */
export function blocosDoDia(tipo: TipoDiaPlanejamento, conteudo: ConteudoDiaPlanejamento): { label: string; texto: string }[] {
  const blocos: { label: string; chave: keyof ConteudoDiaPlanejamento }[] =
    tipo === "TEMATICA"
      ? [
          { label: "Temática do dia", chave: "tematicaDia" },
          { label: "Momento inicial", chave: "momentoInicial" },
          { label: "Questionamentos e diálogos possíveis", chave: "questionamentosInicial" },
          { label: "Momento fundamental", chave: "momentoFundamental" },
          { label: "Questionamentos e diálogos possíveis", chave: "questionamentosFundamental" },
        ]
      : [
          { label: "Contexto organizado", chave: "contextoOrganizado" },
          { label: "Roda de conversa", chave: "rodaDeConversa" },
          { label: "Questionamentos e diálogos possíveis", chave: "questionamentosRoda" },
          { label: "Organização do contexto", chave: "organizacaoContexto" },
          { label: "Questionamentos e diálogos possíveis", chave: "questionamentosContexto" },
        ];
  blocos.push(
    { label: "Momento final", chave: "momentoFinal" },
    { label: "Questionamentos e diálogos possíveis", chave: "questionamentosFinal" }
  );
  return blocos
    .map((b) => ({ label: b.label, texto: conteudo[b.chave] ?? "" }))
    .filter((b) => b.texto);
}
