import type { RegistroPonto } from "@prisma/client";

export function paraMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function calcularMinutosTrabalhados(entrada1?: string | null, saida1?: string | null, entrada2?: string | null, saida2?: string | null, entrada3?: string | null, saida3?: string | null): number {
  let total = 0;
  if (entrada1 && saida1) total += paraMinutos(saida1) - paraMinutos(entrada1);
  if (entrada2 && saida2) total += paraMinutos(saida2) - paraMinutos(entrada2);
  if (entrada3 && saida3) total += paraMinutos(saida3) - paraMinutos(entrada3);
  return total;
}

export function formatarMinutos(minutos: number): string {
  const sinal = minutos < 0 ? "-" : "";
  const abs = Math.abs(minutos);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sinal}${h}:${String(m).padStart(2, "0")}`;
}

// Tolerância diária da CLT (art. 58 §1º): variação de até 10 minutos entre
// horas trabalhadas e previstas não gera desconto nem crédito no banco de
// horas. Só afeta o saldo (banco de horas) — as horas trabalhadas em si
// continuam exibindo o valor batido no ponto, sem arredondar.
const TOLERANCIA_MINUTOS = 10;

export type RegistroComSaldo = RegistroPonto & { saldoDiario: number; saldoAcumulado: number; dentroTolerancia: boolean };

export function comSaldos(registros: RegistroPonto[]): RegistroComSaldo[] {
  const ordenados = [...registros].sort((a, b) => a.data.getTime() - b.data.getTime());
  let acumulado = 0;
  return ordenados.map((r) => {
    const diferenca = r.minutosTrabalhados - r.minutosPrevistos;
    const dentroTolerancia = diferenca !== 0 && Math.abs(diferenca) <= TOLERANCIA_MINUTOS;
    const saldoDiario = dentroTolerancia ? 0 : diferenca;
    acumulado += saldoDiario;
    return { ...r, saldoDiario, saldoAcumulado: acumulado, dentroTolerancia };
  });
}
