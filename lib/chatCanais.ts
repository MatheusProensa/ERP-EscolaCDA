/** Nomes de canal do Realtime — usado tanto no servidor (pra avisar) quanto no
 * navegador (pra escutar), por isso fica num arquivo à parte sem nada de
 * servidor (chave secreta, etc.) dentro. */

/** Canal por par de usuários (sempre a mesma string pros dois lados, id menor
 * primeiro) — usado pra avisar "chegou coisa nova nessa conversa" na hora. */
export function canalConversaDireta(idA: string, idB: string): string {
  return `chat:${[idA, idB].sort().join("_")}`;
}

/** Canal por usuário — avisa a caixa de entrada dele (lista de conversas na
 * lateral) que algo mudou, mesmo se a conversa não estiver aberta. */
export function canalInbox(userId: string): string {
  return `chat-inbox:${userId}`;
}
