import { describe, expect, it } from "vitest";
import { rotaPermitida } from "./permissoes";

describe("rotaPermitida", () => {
  it("libera rota sem regra explícita pra qualquer usuário logado", () => {
    expect(rotaPermitida("/dashboard", "PEDAGOGICO")).toBe(true);
    expect(rotaPermitida("/dashboard", "FINANCEIRO")).toBe(true);
  });

  it("bloqueia módulo restrito pra role sem acesso", () => {
    expect(rotaPermitida("/financeiro", "PEDAGOGICO")).toBe(false);
    expect(rotaPermitida("/usuarios", "PEDAGOGICO")).toBe(false);
  });

  it("libera módulo restrito pra role com acesso", () => {
    expect(rotaPermitida("/financeiro", "FINANCEIRO")).toBe(true);
    expect(rotaPermitida("/usuarios", "ADMIN")).toBe(true);
    expect(rotaPermitida("/usuarios", "DIRECAO")).toBe(true);
  });

  it("ADMIN e DIRECAO (GESTAO) sempre têm acesso a tudo que tem regra", () => {
    expect(rotaPermitida("/financeiro", "ADMIN")).toBe(true);
    expect(rotaPermitida("/estoque", "DIRECAO")).toBe(true);
    expect(rotaPermitida("/api/backup", "DIRECAO")).toBe(true);
  });

  it("casa sub-rotas pelo prefixo (ex.: /alunos/123/editar)", () => {
    expect(rotaPermitida("/alunos/123/editar", "PEDAGOGICO")).toBe(true);
    expect(rotaPermitida("/alunos/123/editar", "FINANCEIRO")).toBe(false);
  });

  it("não casa prefixo parcial de nome (ex.: /alunos não deveria liberar /alunosfake)", () => {
    // "/alunosfake" não é "/alunos" nem começa com "/alunos/" — não deve herdar a regra de /alunos.
    expect(rotaPermitida("/alunosfake", "PEDAGOGICO")).toBe(true); // sem regra própria -> liberado a qualquer logado
    expect(rotaPermitida("/alunosfake", "FINANCEIRO")).toBe(true); // mesma razão, não é bloqueado por engano
  });

  it("regra mais específica (prefixo mais longo) vence sobre a mais genérica", () => {
    // /api/relatorios/chamada é PEDAGOGICO específico, mas não existe uma regra genérica
    // pra /api/relatorios — cada sub-rota de relatório tem a própria regra.
    expect(rotaPermitida("/api/relatorios/chamada", "PEDAGOGICO")).toBe(true);
    expect(rotaPermitida("/api/relatorios/chamada", "FINANCEIRO")).toBe(false);
    expect(rotaPermitida("/api/relatorios/inadimplentes", "FINANCEIRO")).toBe(true);
    expect(rotaPermitida("/api/relatorios/inadimplentes", "PEDAGOGICO")).toBe(false);
  });

  it("rotas de API espelham as regras das páginas correspondentes", () => {
    expect(rotaPermitida("/api/backup", "PEDAGOGICO")).toBe(false);
    expect(rotaPermitida("/api/backup", "DIRECAO")).toBe(true);
  });

  it("role desconhecida (não cadastrada) nunca acessa rota restrita", () => {
    expect(rotaPermitida("/financeiro", "ROLE_INEXISTENTE")).toBe(false);
  });
});
