const TAMANHO_MAX_BYTES = 5 * 1024 * 1024;

/** Validação compartilhada de upload de planilha .xlsx (data URI base64) —
 * usada pelo importador de Alunos e pelo de Ponto. */
export function validarPlanilhaDataUri(dataUri: unknown): { ok: true; buffer: Buffer } | { ok: false; erro: string } {
  if (typeof dataUri !== "string") return { ok: false, erro: "Arquivo inválido" };
  const match = dataUri.match(/^data:([^;]*);base64,(.+)$/);
  if (!match) return { ok: false, erro: "Formato de arquivo inválido" };

  const [, , base64] = match;
  const tamanhoBytes = Math.floor((base64.length * 3) / 4);
  if (tamanhoBytes > TAMANHO_MAX_BYTES) return { ok: false, erro: "Arquivo maior que 5MB" };

  const buffer = Buffer.from(base64, "base64");
  // .xlsx é um ZIP (assinatura "PK") — checagem simples antes de gastar tempo tentando abrir.
  if (buffer.length < 2 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    return { ok: false, erro: "O arquivo não parece ser uma planilha .xlsx válida." };
  }
  return { ok: true, buffer };
}
