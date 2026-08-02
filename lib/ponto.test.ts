import { describe, expect, it } from "vitest";
import { calcularDia, calcularMes, horaParaMin, minParaHora, TOLERANCIA_MIN, type RegistroPontoDia } from "./ponto";

const JORNADA = 8 * 60; // 480min — jornada padrão de 8h usada nos exemplos

function dia(data: string, extra: Partial<RegistroPontoDia> = {}): RegistroPontoDia {
  return {
    data: new Date(data),
    entrada1: null,
    saida1: null,
    entrada2: null,
    saida2: null,
    entrada3: null,
    saida3: null,
    ocorrencia: "NORMAL",
    observacao: null,
    ...extra,
  };
}

describe("calcularDia", () => {
  it("bate ponto exato à jornada prevista -> saldo zero", () => {
    const r = calcularDia(
      dia("2026-03-02", { entrada1: 8 * 60, saida1: 12 * 60, entrada2: 13 * 60, saida2: 17 * 60 }),
      JORNADA,
      0
    );
    expect(r.horasTrabalhadas).toBe(480);
    expect(r.saldoBruto).toBe(0);
    expect(r.saldoDiario).toBe(0);
    expect(r.saldoAcumulado).toBe(0);
  });

  it("diferença dentro da tolerância CLT (< 10min) não gera saldo", () => {
    const r = calcularDia(
      dia("2026-03-02", { entrada1: 8 * 60, saida1: 12 * 60, entrada2: 13 * 60, saida2: 17 * 60 + 5 }),
      JORNADA,
      0
    );
    expect(r.saldoBruto).toBe(5);
    expect(r.saldoDiario).toBe(0);
  });

  it("diferença de exatamente 10min já conta (tolerância é estritamente menor que)", () => {
    const r = calcularDia(
      dia("2026-03-02", { entrada1: 8 * 60, saida1: 12 * 60, entrada2: 13 * 60, saida2: 17 * 60 + TOLERANCIA_MIN }),
      JORNADA,
      0
    );
    expect(r.saldoBruto).toBe(10);
    expect(r.saldoDiario).toBe(10);
    expect(r.horaExtra).toBe(10);
    expect(r.atrasoFalta).toBe(0);
  });

  it("saída antes do previsto gera atraso/falta, não hora extra", () => {
    const r = calcularDia(
      dia("2026-03-02", { entrada1: 8 * 60, saida1: 12 * 60, entrada2: 13 * 60, saida2: 16 * 60 }), // faltou 1h
      JORNADA,
      0
    );
    expect(r.saldoDiario).toBe(-60);
    expect(r.atrasoFalta).toBe(60);
    expect(r.horaExtra).toBe(0);
  });

  it("FALTA desconta a jornada inteira, mesmo sem nenhum horário batido", () => {
    const r = calcularDia(dia("2026-03-02", { ocorrencia: "FALTA" }), JORNADA, 100);
    expect(r.saldoBruto).toBe(-JORNADA);
    expect(r.saldoDiario).toBe(-JORNADA);
    expect(r.atrasoFalta).toBe(JORNADA);
    expect(r.saldoAcumulado).toBe(100 - JORNADA);
  });

  it("ocorrência abonada (feriado/férias/atestado/folga/DSR) não afeta o saldo", () => {
    for (const ocorrencia of ["FERIADO", "FERIAS", "ATESTADO", "FOLGA", "DSR"]) {
      const r = calcularDia(dia("2026-03-02", { ocorrencia }), JORNADA, 50);
      expect(r.horasPrevistas).toBe(0);
      expect(r.saldoDiario).toBe(0);
      expect(r.saldoAcumulado).toBe(50);
    }
  });

  it("calcula adicional noturno pra intervalo inteiramente na janela 22h-05h", () => {
    const r = calcularDia(dia("2026-03-02", { entrada1: 22 * 60, saida1: 23 * 60 }), JORNADA, 0);
    expect(r.adicionalNoturno).toBe(60);
  });

  it("intervalo que vira a meia-noite conta como trabalhado e como noturno corretamente", () => {
    // 23:00 -> 01:00 do dia seguinte: 2h trabalhadas, as 2h inteiras dentro da janela noturna.
    const r = calcularDia(dia("2026-03-02", { entrada1: 23 * 60, saida1: 1 * 60 }), JORNADA, 0);
    expect(r.horasTrabalhadas).toBe(120);
    expect(r.adicionalNoturno).toBe(120);
  });

  it("intervalo diurno não soma nada de adicional noturno", () => {
    const r = calcularDia(dia("2026-03-02", { entrada1: 8 * 60, saida1: 12 * 60 }), JORNADA, 0);
    expect(r.adicionalNoturno).toBe(0);
  });
});

describe("calcularMes", () => {
  it("acumula o saldo dia a dia, em ordem cronológica mesmo se os registros vierem fora de ordem", () => {
    const registros: RegistroPontoDia[] = [
      dia("2026-03-03", { entrada1: 8 * 60, saida1: 12 * 60, entrada2: 13 * 60, saida2: 16 * 60 }), // -60
      dia("2026-03-01", { entrada1: 8 * 60, saida1: 12 * 60, entrada2: 13 * 60, saida2: 17 * 60 + 20 }), // +20
      dia("2026-03-02", { ocorrencia: "FERIADO" }), // 0
    ];
    const dias = calcularMes(registros, JORNADA, 0);
    expect(dias.map((d) => d.data.toISOString().slice(0, 10))).toEqual(["2026-03-01", "2026-03-02", "2026-03-03"]);
    expect(dias[0].saldoAcumulado).toBe(20);
    expect(dias[1].saldoAcumulado).toBe(20);
    expect(dias[2].saldoAcumulado).toBe(-40);
  });

  it("parte do saldoInicial informado em vez de zero", () => {
    const registros: RegistroPontoDia[] = [dia("2026-03-01", { ocorrencia: "FOLGA" })];
    const dias = calcularMes(registros, JORNADA, 300);
    expect(dias[0].saldoAcumulado).toBe(300);
  });

  it("mês sem nenhum registro não quebra e retorna lista vazia", () => {
    expect(calcularMes([], JORNADA, 42)).toEqual([]);
  });
});

describe("minParaHora / horaParaMin", () => {
  it("formata minutos positivos e negativos como H:MM", () => {
    expect(minParaHora(90)).toBe("1:30");
    expect(minParaHora(-90)).toBe("-1:30");
    expect(minParaHora(0)).toBe("0:00");
  });

  it("faz o caminho de ida e volta hora <-> minutos", () => {
    expect(horaParaMin("08:15")).toBe(495);
    expect(minParaHora(495)).toBe("8:15");
  });

  it("rejeita horário inválido", () => {
    expect(horaParaMin("abc")).toBeNull();
    expect(horaParaMin("30:00")).toBeNull();
    expect(horaParaMin("08:99")).toBeNull();
  });
});
