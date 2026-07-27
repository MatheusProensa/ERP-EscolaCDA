export const TOLERANCIA_MIN = 10;
const NOTURNO_INICIO = 22 * 60; // 22:00
const NOTURNO_FIM = 5 * 60; // 05:00

export type ParPonto = { entrada: number | null; saida: number | null };

export type RegistroPontoDia = {
  data: Date;
  entrada1: number | null;
  saida1: number | null;
  entrada2: number | null;
  saida2: number | null;
  entrada3: number | null;
  saida3: number | null;
  ocorrencia: string;
  observacao?: string | null;
};

export type DiaCalculado = {
  data: Date;
  pares: ParPonto[];
  ocorrencia: string;
  observacao?: string | null;
  horasTrabalhadas: number;
  horasPrevistas: number;
  adicionalNoturno: number;
  saldoBruto: number;
  saldoDiario: number;
  saldoAcumulado: number;
};

const OCORRENCIAS_ABONADAS = new Set(["FERIADO", "FERIAS", "ATESTADO", "FOLGA", "DSR"]);

function duracaoIntervalo(entrada: number, saida: number): number {
  return saida >= entrada ? saida - entrada : saida + 24 * 60 - entrada;
}

/** Minutos de um intervalo [entrada, saida) que caem na janela noturna 22:00–05:00 (vira o dia). */
function minutosNoturnos(entrada: number, saida: number): number {
  const fimAbsoluto = saida >= entrada ? saida : saida + 24 * 60;
  let total = 0;
  // Janela 1: 22:00–24:00 do mesmo dia
  total += overlap(entrada, fimAbsoluto, NOTURNO_INICIO, 24 * 60);
  // Janela 2: 00:00–05:00 do dia seguinte (representado como 24:00–29:00)
  total += overlap(entrada, fimAbsoluto, 24 * 60, 24 * 60 + NOTURNO_FIM);
  return total;
}

function overlap(aInicio: number, aFim: number, bInicio: number, bFim: number): number {
  return Math.max(0, Math.min(aFim, bFim) - Math.max(aInicio, bInicio));
}

export function minParaHora(min: number): string {
  const sinal = min < 0 ? "-" : "";
  const abs = Math.round(Math.abs(min));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sinal}${h}:${String(m).padStart(2, "0")}`;
}

export function horaParaMin(hora: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hora.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 29 || min > 59) return null;
  return h * 60 + min;
}

export function calcularDia(
  registro: RegistroPontoDia,
  jornadaPrevistaMinutos: number,
  saldoAnterior: number
): DiaCalculado {
  const pares: ParPonto[] = [
    { entrada: registro.entrada1, saida: registro.saida1 },
    { entrada: registro.entrada2, saida: registro.saida2 },
    { entrada: registro.entrada3, saida: registro.saida3 },
  ];

  let horasTrabalhadas = 0;
  let adicionalNoturno = 0;
  for (const par of pares) {
    if (par.entrada == null || par.saida == null) continue;
    horasTrabalhadas += duracaoIntervalo(par.entrada, par.saida);
    adicionalNoturno += minutosNoturnos(par.entrada, par.saida);
  }

  const abonado = OCORRENCIAS_ABONADAS.has(registro.ocorrencia);
  const isFalta = registro.ocorrencia === "FALTA";

  const horasPrevistas = abonado ? 0 : jornadaPrevistaMinutos;
  let saldoBruto: number;
  if (isFalta) {
    saldoBruto = -jornadaPrevistaMinutos;
  } else if (abonado) {
    saldoBruto = 0;
  } else {
    saldoBruto = horasTrabalhadas - horasPrevistas;
  }

  // Tolerância CLT (art. 58 §1º): variação estritamente menor que o limite não gera saldo
  // (confirmado contra o sistema eletrônico real: diferença de exatos 10min já conta).
  const saldoDiario = !isFalta && !abonado && Math.abs(saldoBruto) < TOLERANCIA_MIN ? 0 : saldoBruto;

  return {
    data: registro.data,
    pares,
    ocorrencia: registro.ocorrencia,
    observacao: registro.observacao,
    horasTrabalhadas,
    horasPrevistas,
    adicionalNoturno,
    saldoBruto,
    saldoDiario,
    saldoAcumulado: saldoAnterior + saldoDiario,
  };
}

export function calcularMes(
  registros: RegistroPontoDia[],
  jornadaPrevistaMinutos: number,
  saldoInicial = 0
): DiaCalculado[] {
  const ordenados = [...registros].sort((a, b) => a.data.getTime() - b.data.getTime());
  let saldo = saldoInicial;
  const dias: DiaCalculado[] = [];
  for (const registro of ordenados) {
    const dia = calcularDia(registro, jornadaPrevistaMinutos, saldo);
    saldo = dia.saldoAcumulado;
    dias.push(dia);
  }
  return dias;
}

export const OCORRENCIA_LABEL: Record<string, string> = {
  NORMAL: "Normal",
  FALTA: "Falta",
  FERIADO: "Feriado",
  FERIAS: "Férias",
  ATESTADO: "Atestado",
  FOLGA: "Folga",
  DSR: "DSR",
};
