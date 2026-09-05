import { describe, expect, it } from "vitest";
import { rotaPermitida, acessoPermitido } from "./permissoes";

describe("rotaPermitida", () => {
  it("libera rota sem regra explícita pra qualquer usuário logado", () => {
    expect(rotaPermitida("/dashboard", "PEDAGOGICO")).toBe(true);
    expect(rotaPermitida("/dashboard", "FINANCEIRO")).toBe(true);
  });

  it("bloqueia módulo restrito pra role sem acesso", () => {
    expect(rotaPermitida("/ponto", "PEDAGOGICO")).toBe(false);
    expect(rotaPermitida("/usuarios", "PEDAGOGICO")).toBe(false);
  });

  it("libera módulo restrito pra role com acesso", () => {
    expect(rotaPermitida("/ponto", "FINANCEIRO")).toBe(true);
    expect(rotaPermitida("/usuarios", "ADMIN")).toBe(true);
    expect(rotaPermitida("/usuarios", "DIRECAO")).toBe(true);
  });

  it("ADMIN e DIRECAO (GESTAO) sempre têm acesso a tudo que tem regra", () => {
    expect(rotaPermitida("/ponto", "ADMIN")).toBe(true);
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
    expect(rotaPermitida("/api/relatorios/ponto", "FINANCEIRO")).toBe(true);
    expect(rotaPermitida("/api/relatorios/ponto", "PEDAGOGICO")).toBe(false);
  });

  it("rotas de API espelham as regras das páginas correspondentes", () => {
    expect(rotaPermitida("/api/backup", "PEDAGOGICO")).toBe(false);
    expect(rotaPermitida("/api/backup", "DIRECAO")).toBe(true);
  });

  it("role desconhecida (não cadastrada) nunca acessa rota restrita", () => {
    expect(rotaPermitida("/ponto", "ROLE_INEXISTENTE")).toBe(false);
  });
});

describe("acessoPermitido (permissão granular por pessoa)", () => {
  // "estoque" está na grade (MODULOS) — pra módulo da grade, o Role não
  // decide mais nada sozinho, só a marcação explícita (ver comentário de
  // acessoPermitido em permissoes.ts). Sem override, nem quem o Role
  // liberaria por padrão (ADMINISTRATIVO, dono normal de Estoque) entra.
  it("módulo da grade sem override nega acesso, mesmo pra Role que o pacote padrão liberaria", () => {
    expect(acessoPermitido("/estoque", "GET", "PEDAGOGICO")).toBe(false);
    expect(acessoPermitido("/estoque", "POST", "ADMINISTRATIVO")).toBe(false);
  });

  it("ADMIN sempre acessa módulo da grade, mesmo sem override — senão ninguém configura a grade de mais ninguém", () => {
    expect(acessoPermitido("/estoque", "POST", "ADMIN")).toBe(true);
  });

  it("override NENHUM bloqueia mesmo quem o Role liberaria", () => {
    expect(acessoPermitido("/estoque", "GET", "ADMINISTRATIVO", { estoque: "NENHUM" })).toBe(false);
  });

  it("override VER libera leitura mas bloqueia escrita", () => {
    expect(acessoPermitido("/estoque", "GET", "ADMINISTRATIVO", { estoque: "VER" })).toBe(true);
    expect(acessoPermitido("/api/estoque", "POST", "ADMINISTRATIVO", { estoque: "VER" })).toBe(false);
    expect(acessoPermitido("/api/estoque/1", "DELETE", "ADMINISTRATIVO", { estoque: "VER" })).toBe(false);
  });

  it("override EDITAR libera até quem o Role bloquearia", () => {
    expect(acessoPermitido("/estoque", "GET", "PEDAGOGICO", { estoque: "EDITAR" })).toBe(true);
    expect(acessoPermitido("/api/estoque", "POST", "PEDAGOGICO", { estoque: "EDITAR" })).toBe(true);
  });

  it("override de um módulo não vaza pra outro", () => {
    expect(acessoPermitido("/ponto", "GET", "PEDAGOGICO", { estoque: "EDITAR" })).toBe(false);
  });
});
