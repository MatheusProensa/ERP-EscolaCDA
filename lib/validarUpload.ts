const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const TAMANHO_MAX_BYTES = 5 * 1024 * 1024; // 5MB — sempre um pouco acima do limite dos componentes client-side

/** Confere se uma data URI recebida do client é de fato um arquivo permitido
 * (mesmo tipo/tamanho já checados no browser, mas isso é fácil de burlar
 * chamando a API direto — a validação que importa é sempre a do servidor). */
export function validarUploadDataUri(dataUri: unknown): { ok: true } | { ok: false; erro: string } {
  if (typeof dataUri !== "string") return { ok: false, erro: "Arquivo inválido" };

  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return { ok: false, erro: "Formato de arquivo inválido" };

  const [, mime, base64] = match;
  if (!TIPOS_PERMITIDOS.includes(mime)) {
    return { ok: false, erro: `Tipo de arquivo não permitido (${mime})` };
  }

  // Tamanho real do binário a partir do base64 (cada 4 chars ≈ 3 bytes).
  const tamanhoBytes = Math.floor((base64.length * 3) / 4);
  if (tamanhoBytes > TAMANHO_MAX_BYTES) {
    return { ok: false, erro: "Arquivo maior que 5MB" };
  }

  return { ok: true };
}
