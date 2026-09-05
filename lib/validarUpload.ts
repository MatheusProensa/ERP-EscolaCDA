const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const TAMANHO_MAX_BYTES = 5 * 1024 * 1024; // 5MB — sempre um pouco acima do limite dos componentes client-side

/** Confere a assinatura real dos primeiros bytes do arquivo — o `mime` da
 * data URI é só o que o NAVEGADOR declarou, e isso é fácil de forjar
 * (mandar bytes de outra coisa qualquer com `data:image/png;base64,...` na
 * frente). Sem isso, um arquivo poderia ser salvo com um tipo mentiroso e,
 * dependendo de onde/como for reaberto depois, ser interpretado como algo
 * diferente do que o sistema pensa que é. */
function assinaturaBate(mime: string, buffer: Buffer): boolean {
  switch (mime) {
    case "image/png":
      return buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    case "image/jpeg":
      return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "image/webp":
      return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
    case "application/pdf":
      return buffer.length >= 5 && buffer.toString("ascii", 0, 5) === "%PDF-";
    default:
      return false;
  }
}

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

  const buffer = Buffer.from(base64.slice(0, 32), "base64");
  if (!assinaturaBate(mime, buffer)) {
    return { ok: false, erro: "O conteúdo do arquivo não bate com o tipo informado" };
  }

  return { ok: true };
}
