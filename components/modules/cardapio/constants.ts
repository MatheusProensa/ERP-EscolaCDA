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

/** Responsável técnica que monta o cardápio todo mês — crédito e as
 * observações que ela sempre manda junto no documento original (alterações
 * só com autorização dela, frutas da estação). Aparece na tela e em todo PDF
 * exportado, não só quando alguém pede — informação de origem real, não pode
 * ficar faltando em nenhum lugar. */
export const NUTRICIONISTA_CARDAPIO = {
  nome: "Natália Dotto Flores",
  registro: "CRN2 9671D",
  observacoes: [
    "*O cardápio poderá sofrer alterações por alimentos de mesmo valor nutricional, caso haja alguma intercorrência, com autorização prévia da Nutricionista.",
    "Será ofertado sempre 2 tipos de Frutas da estação.",
  ],
};

/** Cor por tipo de refeição — categoria fixa (mesmo horário sempre significa a
 * mesma coisa), por isso é um mapa direto e não um hash como em Interessados. */
export const COR_REFEICAO: Record<string, BadgeVariant> = {
  LANCHE_MANHA: "cat5",
  ALMOCO: "cat1",
  LANCHE_1: "cat2",
  LANCHE_2: "cat4",
};
