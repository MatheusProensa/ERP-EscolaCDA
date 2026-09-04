export type RefeicaoCardapio = { tipo: string; label: string; horario: string; itens: string };
export type DiaCardapio = { dia: string; datas: string[]; refeicoes: RefeicaoCardapio[] };
export type SemanasCardapio = { impar: DiaCardapio[]; par: DiaCardapio[] };

export type ItemCardapioMes = {
  id: string;
  ano: number;
  mes: number;
  publico: string;
  semanas: SemanasCardapio;
};
