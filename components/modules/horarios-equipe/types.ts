/** `horario` fica de fora quando a gente não tem certeza da hora exata (ex.:
 * bloco da Secretaria, onde o texto original do PDF ficou ambíguo demais pra
 * cravar sem chutar) — nesse caso a tela cai pra lista simples, sem linha do
 * tempo, em vez de inventar um horário. */
export type PessoaEvento = { pessoa: string; horario?: string; nota: string };

export type ItemEscalaBloco = {
  id: string;
  ano: number;
  ordem: number;
  titulo: string;
  tipo: "TURNO" | "NOTA";
  horariosReferencia: string[];
  entradas: PessoaEvento[] | null;
  saidas: PessoaEvento[] | null;
  conteudoLivre: string | null;
};
