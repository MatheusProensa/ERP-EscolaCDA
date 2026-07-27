export const CATEGORIAS_EVENTO = [
  "Organização Interna",
  "Eventos e Atividades",
  "Marketing",
  "Reuniões",
  "Datas Comemorativas",
  "Recesso/Feriado",
] as const;

export type CategoriaEvento = (typeof CATEGORIAS_EVENTO)[number];

export const COR_CATEGORIA: Record<string, { bg: string; text: string; dot: string }> = {
  "Organização Interna": { bg: "#FDF1E0", text: "#B5670C", dot: "#F5A524" },
  "Eventos e Atividades": { bg: "#E6F0FD", text: "#1A6FD8", dot: "#1A6FD8" },
  Marketing: { bg: "#F3E8FD", text: "#7C3AED", dot: "#7C3AED" },
  Reuniões: { bg: "#E5F7EE", text: "#16A34A", dot: "#16A34A" },
  "Datas Comemorativas": { bg: "#FCE7F3", text: "#DB2777", dot: "#DB2777" },
  "Recesso/Feriado": { bg: "#FDE8E8", text: "#DC2626", dot: "#DC2626" },
};

export function corCategoria(categoria: string) {
  return COR_CATEGORIA[categoria] ?? { bg: "#F1F3F7", text: "#5A6A85", dot: "#9AAABE" };
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
