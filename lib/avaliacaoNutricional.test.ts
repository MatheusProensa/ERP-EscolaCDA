import { describe, expect, it } from "vitest";
import { avaliarImcPorIdade, idadeEmDiasCompletos, calcularImc } from "./avaliacaoNutricional";
import { LMS_IMC_MENINOS, LMS_IMC_MENINAS } from "./oms-imc-lms-data";

describe("idadeEmDiasCompletos", () => {
  it("conta dias completos entre nascimento e a avaliação", () => {
    expect(idadeEmDiasCompletos(new Date("2024-01-01T00:00:00.000Z"), new Date("2024-01-11T00:00:00.000Z"))).toBe(10);
  });
});

describe("calcularImc", () => {
  it("peso (kg) / altura (m) ao quadrado", () => {
    expect(calcularImc(15, 100)).toBeCloseTo(15, 5);
  });
});

describe("avaliarImcPorIdade", () => {
  it("no peso exatamente mediano (M da tabela OMS) cai no percentil 50, Eutrófico", () => {
    // Dia 500 é só um ponto qualquer dentro da tabela (0-1826) — o teste vale
    // pra qualquer dia, testar num específico só fixa o resultado esperado.
    const dia = 500;
    const [, m] = LMS_IMC_MENINOS[dia];
    const dataNascimento = new Date("2024-01-01T00:00:00.000Z");
    const dataAvaliacao = new Date(dataNascimento.getTime() + dia * 24 * 60 * 60 * 1000);
    // IMC = m → escolhe altura 100cm fixa e resolve o peso que dá esse IMC.
    const alturaCm = 100;
    const pesoKg = m * (alturaCm / 100) ** 2;

    const resultado = avaliarImcPorIdade({ sexo: "M", dataNascimento, dataAvaliacao, pesoKg, alturaCm });

    expect(resultado.idadeDias).toBe(dia);
    expect(resultado.zScore).toBeCloseTo(0, 5);
    expect(resultado.percentil).toBeCloseTo(50, 3);
    expect(resultado.classificacao).toBe("EUTROFICO");
    expect(resultado.foraDaFaixaEtaria).toBe(false);
  });

  it("bem acima da mediana (M) vira Obesidade — testa o lado alto (percentil >97)", () => {
    const dia = 900;
    const [, m] = LMS_IMC_MENINAS[dia];
    const dataNascimento = new Date("2023-01-01T00:00:00.000Z");
    const dataAvaliacao = new Date(dataNascimento.getTime() + dia * 24 * 60 * 60 * 1000);
    const alturaCm = 100;
    const pesoKg = m * 1.6 * (alturaCm / 100) ** 2; // bem acima da mediana

    const resultado = avaliarImcPorIdade({ sexo: "F", dataNascimento, dataAvaliacao, pesoKg, alturaCm });
    expect(resultado.classificacao).toBe("OBESIDADE");
    expect(resultado.percentil).toBeGreaterThan(97);
  });

  it("bem abaixo da mediana vira Baixo IMC — testa o lado baixo (percentil <3)", () => {
    const dia = 900;
    const [, m] = LMS_IMC_MENINOS[dia];
    const dataNascimento = new Date("2023-01-01T00:00:00.000Z");
    const dataAvaliacao = new Date(dataNascimento.getTime() + dia * 24 * 60 * 60 * 1000);
    const alturaCm = 100;
    const pesoKg = m * 0.6 * (alturaCm / 100) ** 2; // bem abaixo da mediana

    const resultado = avaliarImcPorIdade({ sexo: "M", dataNascimento, dataAvaliacao, pesoKg, alturaCm });
    expect(resultado.classificacao).toBe("BAIXO");
    expect(resultado.percentil).toBeLessThan(3);
  });

  it("sinaliza foraDaFaixaEtaria sem travar quando a criança passa dos 5 anos", () => {
    const dataNascimento = new Date("2015-01-01T00:00:00.000Z");
    const dataAvaliacao = new Date("2026-01-01T00:00:00.000Z"); // 11 anos
    const resultado = avaliarImcPorIdade({ sexo: "M", dataNascimento, dataAvaliacao, pesoKg: 30, alturaCm: 130 });
    expect(resultado.foraDaFaixaEtaria).toBe(true);
    // ainda devolve um resultado (usando o último dia da tabela), não lança erro
    expect(resultado.classificacao).toBeDefined();
  });
});
