import { describe, expect, it } from "vitest";
import { validarUploadDataUri } from "./validarUpload";

// Assinatura real (magic bytes) de cada tipo — sem isso na frente, o
// conteúdo "de mentira" dos testes seria rejeitado pela checagem de
// assinatura, que existe justamente pra não aceitar bytes que não batem
// com o tipo declarado.
const ASSINATURA: Record<string, Buffer> = {
  "image/png": Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  "image/jpeg": Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  "image/webp": Buffer.concat([Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("WEBP")]),
  "application/pdf": Buffer.from("%PDF-1.4"),
};

function dataUri(mime: string, tamanhoBytes: number, { assinaturaValida = true } = {}): string {
  const cabecalho = assinaturaValida && ASSINATURA[mime] ? ASSINATURA[mime] : Buffer.alloc(0);
  const resto = Buffer.alloc(Math.max(0, tamanhoBytes - cabecalho.length), 0x41); // 0x41 = "A"
  const base64 = Buffer.concat([cabecalho, resto]).toString("base64");
  return `data:${mime};base64,${base64}`;
}

describe("validarUploadDataUri", () => {
  it("aceita imagem jpeg dentro do limite", () => {
    expect(validarUploadDataUri(dataUri("image/jpeg", 1024))).toEqual({ ok: true });
  });

  it("aceita PDF dentro do limite", () => {
    expect(validarUploadDataUri(dataUri("application/pdf", 1024))).toEqual({ ok: true });
  });

  it("aceita png e webp dentro do limite", () => {
    expect(validarUploadDataUri(dataUri("image/png", 1024))).toEqual({ ok: true });
    expect(validarUploadDataUri(dataUri("image/webp", 1024))).toEqual({ ok: true });
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

  it("rejeita quando o mimetype diz uma coisa mas o conteúdo é outra (mimetype forjado)", () => {
    // Declara "image/png" mas manda bytes de PDF — o navegador nunca faz
    // isso sozinho, mas chamar a API direto (sem passar pela tela) sim.
    const r = validarUploadDataUri(dataUri("image/png", 1024, { assinaturaValida: false }));
    expect(r).toEqual({ ok: false, erro: "O conteúdo do arquivo não bate com o tipo informado" });
  });

  it("rejeita PDF sem a assinatura %PDF- de verdade", () => {
    const r = validarUploadDataUri(dataUri("application/pdf", 1024, { assinaturaValida: false }));
    expect(r.ok).toBe(false);
  });
});
