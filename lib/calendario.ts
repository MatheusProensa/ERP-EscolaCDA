export const CATEGORIAS_EVENTO = [
  "Organização Interna",
  "Eventos e Atividades",
  "Marketing",
  "Reuniões",
  "Datas Comemorativas",
  "Recesso/Feriado",
] as const;

export type CategoriaEvento = (typeof CATEGORIAS_EVENTO)[number];

/**
 * Paleta CATEGÓRICA (--cat-N-*): sem verde e sem vermelho, para que nenhuma
 * categoria de evento seja lida como estado (handoff de design, etapa 3.3).
 * As mesmas variáveis alimentam as etiquetas de tipo no Log de Atividades, o
 * turno da turma e a categoria de material no Estoque. Organização Interna,
 * Eventos, Marketing e Datas Comemorativas mantêm o mesmo matiz de antes —
 * Reuniões deixa de ser verde e Recesso/Feriado deixa de ser vermelho.
 */
export const COR_CATEGORIA: Record<string, { bg: string; text: string; dot: string }> = {
  "Organização Interna": { bg: "var(--cat-5-bg)", text: "var(--cat-5-text)", dot: "var(--cat-5-dot)" },
  "Eventos e Atividades": { bg: "var(--cat-1-bg)", text: "var(--cat-1-text)", dot: "var(--cat-1-dot)" },
  Marketing: { bg: "var(--cat-3-bg)", text: "var(--cat-3-text)", dot: "var(--cat-3-dot)" },
  Reuniões: { bg: "var(--cat-2-bg)", text: "var(--cat-2-text)", dot: "var(--cat-2-dot)" },
  "Datas Comemorativas": { bg: "var(--cat-4-bg)", text: "var(--cat-4-text)", dot: "var(--cat-4-dot)" },
  "Recesso/Feriado": { bg: "var(--cat-6-bg)", text: "var(--cat-6-text)", dot: "var(--cat-6-dot)" },
};

const FALLBACK_CATEGORIA = { bg: "var(--cat-6-bg)", text: "var(--cat-6-text)", dot: "var(--cat-6-dot)" };

export function corCategoria(categoria: string) {
  return COR_CATEGORIA[categoria] ?? FALLBACK_CATEGORIA;
}

export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const DIAS_SEMANA_ABREV = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Grade de semanas completas (6 linhas x 7 dias, UTC) cobrindo o mês, com dias dos meses vizinhos. */
export function gerarGradeMes(ano: number, mes: number): { data: Date; doMesAtual: boolean }[] {
  const primeiroDia = new Date(Date.UTC(ano, mes - 1, 1));
  const inicioGrade = new Date(primeiroDia);
  inicioGrade.setUTCDate(inicioGrade.getUTCDate() - primeiroDia.getUTCDay());

  const dias: { data: Date; doMesAtual: boolean }[] = [];
  const cursor = new Date(inicioGrade);
  for (let i = 0; i < 42; i++) {
    dias.push({ data: new Date(cursor), doMesAtual: cursor.getUTCMonth() === mes - 1 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dias;
}

export function mesmaData(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}
