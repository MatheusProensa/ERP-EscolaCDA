import { describe, expect, it } from "vitest";
import { segundaFeiraDe, diasDaSemana, isoData } from "./planejamento";

function utc(ano: number, mes: number, dia: number): Date {
  return new Date(Date.UTC(ano, mes - 1, dia));
}

describe("segundaFeiraDe", () => {
  it("mantém a segunda-feira quando já é segunda", () => {
    expect(isoData(segundaFeiraDe(utc(2026, 9, 14)))).toBe("2026-09-14");
  });

  it("volta pra segunda a partir de qualquer dia da semana", () => {
    expect(isoData(segundaFeiraDe(utc(2026, 9, 15)))).toBe("2026-09-14"); // terça
    expect(isoData(segundaFeiraDe(utc(2026, 9, 18)))).toBe("2026-09-14"); // sexta
  });

  it("domingo volta pra segunda da semana ANTERIOR, não avança", () => {
    expect(isoData(segundaFeiraDe(utc(2026, 9, 20)))).toBe("2026-09-14"); // domingo
  });

  it("sábado também fica na mesma semana", () => {
    expect(isoData(segundaFeiraDe(utc(2026, 9, 19)))).toBe("2026-09-14"); // sábado
  });
});

describe("diasDaSemana", () => {
  it("devolve segunda a sexta, em ordem", () => {
    const dias = diasDaSemana(utc(2026, 9, 14)).map(isoData);
    expect(dias).toEqual(["2026-09-14", "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18"]);
  });
});
