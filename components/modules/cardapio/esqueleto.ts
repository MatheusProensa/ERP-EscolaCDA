import { DIAS_SEMANA_CARDAPIO } from "./constants";
import type { DiaCardapio, SemanasCardapio } from "./types";

/** Refeições/horários padrão por público — usado só pra montar o esqueleto de
 * um mês novo (sem itens ainda). Se um público realmente precisar de um
 * horário diferente num mês específico, dá pra ajustar direto pelo editor
 * (o campo "Hora" fica editável, isso aqui é só o ponto de partida). */
const REFEICOES_TEMPLATE: Record<string, { tipo: string; label: string; horario: string }[]> = {
  MATERNAL_PRE: [
    { tipo: "LANCHE_MANHA", label: "Lanche da manhã", horario: "9:00" },
    { tipo: "ALMOCO", label: "Almoço", horario: "11:00" },
    { tipo: "LANCHE_1", label: "Lanche da tarde 1", horario: "14:00" },
    { tipo: "LANCHE_2", label: "Lanche da tarde 2", horario: "16:00" },
  ],
  BERCARIO: [
    { tipo: "LANCHE_MANHA", label: "Lanche da manhã", horario: "9:00" },
    { tipo: "ALMOCO", label: "Almoço", horario: "11:00" },
    { tipo: "LANCHE_1", label: "Lanche da tarde 1", horario: "15:00" },
    { tipo: "LANCHE_2", label: "Lanche da tarde 2", horario: "17:00" },
  ],
  FUNDAMENTAL: [
    { tipo: "LANCHE_MANHA", label: "Lanche da manhã", horario: "9:00" },
    { tipo: "ALMOCO", label: "Almoço", horario: "11:00" },
    { tipo: "LANCHE_1", label: "Lanche da tarde", horario: "15:30" },
  ],
};

// JS Date.getUTCDay(): 0=domingo ... 6=sábado. Só nos interessam 1..5.
const DIA_POR_GETDAY: Record<number, string> = { 1: "SEGUNDA", 2: "TERCA", 3: "QUARTA", 4: "QUINTA", 5: "SEXTA" };

/** Pra cada dia útil (seg-sex), separa as datas do mês em "1ª e 3ª ocorrência"
 * (padrão ímpar) e "2ª e 4ª" (padrão par) — é exatamente como a Nutricionista
 * já organiza o cardápio real, só que calculado a partir do calendário em vez
 * de digitado à mão. Uma 5ª ocorrência (meses mais longos) cai no padrão par,
 * só como rótulo informativo — não muda o conteúdo do cardápio. */
function datasPorPadrao(ano: number, mes: number): Record<string, { impar: string[]; par: string[] }> {
  const porDia: Record<string, string[]> = { SEGUNDA: [], TERCA: [], QUARTA: [], QUINTA: [], SEXTA: [] };
  const diasNoMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    const codigo = DIA_POR_GETDAY[data.getUTCDay()];
    if (codigo) porDia[codigo].push(`${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}`);
  }
  const resultado: Record<string, { impar: string[]; par: string[] }> = {};
  for (const [codigo, datas] of Object.entries(porDia)) {
    resultado[codigo] = {
      impar: datas.filter((_, i) => i % 2 === 0),
      par: datas.filter((_, i) => i % 2 === 1),
    };
  }
  return resultado;
}

/** Esqueleto de um mês sem cardápio cadastrado ainda: dias/datas certos do
 * calendário e as refeições/horários padrão do público, tudo com item em
 * branco — só pronto pra alguém digitar, nunca inventa conteúdo. */
export function gerarEsqueletoSemanas(publico: string, ano: number, mes: number): SemanasCardapio {
  const template = REFEICOES_TEMPLATE[publico] ?? REFEICOES_TEMPLATE.MATERNAL_PRE;
  const datas = datasPorPadrao(ano, mes);

  function montar(padrao: "impar" | "par"): DiaCardapio[] {
    return DIAS_SEMANA_CARDAPIO.map((diaCod) => ({
      dia: diaCod,
      datas: datas[diaCod]?.[padrao] ?? [],
      refeicoes: template.map((r) => ({ ...r, itens: "" })),
    }));
  }

  return { impar: montar("impar"), par: montar("par") };
}

/** Usado por "copiar do mês anterior": mantém as refeições/itens de outro mês
 * (Setembro geralmente repete Agosto, só muda um ou outro item) mas troca as
 * datas de cada dia pelas do mês novo — copiar "03/08" pra Setembro ficaria
 * errado. */
export function comDatasDoMes(semanas: SemanasCardapio, ano: number, mes: number): SemanasCardapio {
  const datas = datasPorPadrao(ano, mes);

  function trocarDatas(dias: DiaCardapio[], padrao: "impar" | "par"): DiaCardapio[] {
    return dias.map((d) => ({ ...d, datas: datas[d.dia]?.[padrao] ?? [] }));
  }

  return { impar: trocarDatas(semanas.impar, "impar"), par: trocarDatas(semanas.par, "par") };
}
