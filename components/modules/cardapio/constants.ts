import type { BadgeVariant } from "@/components/ui/Badge";

/** Públicos atendidos pela Nutricionista — cada um vem numa tabela separada no
 * documento que ela manda todo mês. Berçário I (sem sal, sem açúcar) e II (sem
 * açúcar, com sal) dividem a mesma tabela no original — é uma nota de dieta,
 * não um cardápio à parte por criança. */
export const PUBLICOS_CARDAPIO: { valor: string; label: string; nota?: string; cor: BadgeVariant }[] = [
  { valor: "MATERNAL_PRE", label: "Maternal e Pré-escola", cor: "cat1" },
  { valor: "BERCARIO", label: "Berçário I e II", nota: "Berçário I: sem sal, sem açúcar · Berçário II: sem açúcar, com sal", cor: "cat4" },
  { valor: "FUNDAMENTAL", label: "Ensino Fundamental", cor: "cat3" },
];

export const DIAS_SEMANA_CARDAPIO = ["SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA"] as const;
export const DIA_LABEL_CARDAPIO: Record<string, string> = {
  SEGUNDA: "Segunda-feira",
  TERCA: "Terça-feira",
  QUARTA: "Quarta-feira",
  QUINTA: "Quinta-feira",
  SEXTA: "Sexta-feira",
};

export const MESES_CARDAPIO = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Cor por tipo de refeição — categoria fixa (mesmo horário sempre significa a
 * mesma coisa), por isso é um mapa direto e não um hash como em Interessados. */
export const COR_REFEICAO: Record<string, BadgeVariant> = {
  LANCHE_MANHA: "cat5",
  ALMOCO: "cat1",
  LANCHE_1: "cat2",
  LANCHE_2: "cat4",
};
