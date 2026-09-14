import { describe, expect, it } from "vitest";
import { segundaFeiraDe, diasDaSemana, isoData, tituloDoDia, bulletsDoDia } from "./planejamento";

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

describe("tituloDoDia", () => {
  it("usa tematicaDia pro tipo TEMATICA", () => {
    expect(tituloDoDia("TEMATICA", { tematicaDia: "Bichos da fazenda", contextoOrganizado: "outro" })).toBe("Bichos da fazenda");
  });

  it("usa contextoOrganizado pro tipo CONTEXTO", () => {
    expect(tituloDoDia("CONTEXTO", { tematicaDia: "outro", contextoOrganizado: "Cesto dos tesouros" })).toBe("Cesto dos tesouros");
  });

  it("devolve string vazia quando não tem nada preenchido", () => {
    expect(tituloDoDia("TEMATICA", {})).toBe("");
  });
});

describe("bulletsDoDia", () => {
  it("tipo TEMATICA: momento inicial + fundamental + final, só o que tiver preenchido", () => {
    expect(
      bulletsDoDia("TEMATICA", { momentoInicial: "Roda de música", momentoFundamental: "Exploração de texturas", momentoFinal: "Desenho livre" })
    ).toEqual(["Roda de música", "Exploração de texturas", "Desenho livre"]);
  });

  it("tipo CONTEXTO: roda de conversa + organização do contexto", () => {
    expect(bulletsDoDia("CONTEXTO", { rodaDeConversa: "Conversa sobre frutas", organizacaoContexto: "Cesto sensorial" })).toEqual([
      "Conversa sobre frutas",
      "Cesto sensorial",
    ]);
  });

  it("ignora campo do outro tipo e campos vazios", () => {
    expect(bulletsDoDia("TEMATICA", { rodaDeConversa: "não deveria aparecer", momentoInicial: "Chegada" })).toEqual(["Chegada"]);
  });
});
