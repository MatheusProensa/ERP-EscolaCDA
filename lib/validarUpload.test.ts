import { describe, expect, it } from "vitest";
import { validarUploadDataUri } from "./validarUpload";

function dataUri(mime: string, tamanhoBytes: number): string {
  // base64 tem ~4/3 do tamanho binário original.
  const base64 = "A".repeat(Math.ceil((tamanhoBytes * 4) / 3));
  return `data:${mime};base64,${base64}`;
}

describe("validarUploadDataUri", () => {
  it("aceita imagem jpeg dentro do limite", () => {
    expect(validarUploadDataUri(dataUri("image/jpeg", 1024))).toEqual({ ok: true });
  });

  it("aceita PDF dentro do limite", () => {
    expect(validarUploadDataUri(dataUri("application/pdf", 1024))).toEqual({ ok: true });
  });

  it("rejeita quando não é string", () => {
    expect(validarUploadDataUri(undefined)).toEqual({ ok: false, erro: "Arquivo inválido" });
    expect(validarUploadDataUri(123)).toEqual({ ok: false, erro: "Arquivo inválido" });
    expect(validarUploadDataUri(null)).toEqual({ ok: false, erro: "Arquivo inválido" });
  });

  it("rejeita string que não é uma data URI válida", () => {
    const r = validarUploadDataUri("não é um arquivo");
    expect(r.ok).toBe(false);
  });

  it("rejeita tipo MIME fora da lista permitida (ex.: script disfarçado)", () => {
    const r = validarUploadDataUri(dataUri("application/x-sh", 100));
    expect(r).toEqual({ ok: false, erro: "Tipo de arquivo não permitido (application/x-sh)" });
  });

  it("rejeita svg (poderia conter script embutido)", () => {
    const r = validarUploadDataUri(dataUri("image/svg+xml", 100));
    expect(r.ok).toBe(false);
  });

  it("rejeita arquivo maior que 5MB mesmo que o mimetype seja válido", () => {
    const r = validarUploadDataUri(dataUri("image/png", 6 * 1024 * 1024));
    expect(r).toEqual({ ok: false, erro: "Arquivo maior que 5MB" });
  });

  it("aceita arquivo bem no limite de 5MB", () => {
    const r = validarUploadDataUri(dataUri("image/png", 5 * 1024 * 1024 - 1024));
    expect(r.ok).toBe(true);
  });

});
