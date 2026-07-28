import crypto from "crypto";

/** Senha legível tipo "trilha-forte-8291" — evita senha fixa hardcoded que ficaria exposta no repositório. */
export function gerarSenhaAleatoria(): string {
  const palavras = ["trilha", "girassol", "recreio", "estrela", "canela", "bambu", "cometa", "violeta", "sereno", "coral"];
  const a = palavras[crypto.randomInt(palavras.length)];
  const b = palavras[crypto.randomInt(palavras.length)];
  const n = crypto.randomInt(1000, 9999);
  return `${a}-${b}-${n}`;
}
