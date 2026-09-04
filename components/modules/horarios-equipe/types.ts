export type PessoaEvento = { pessoa: string; nota: string };

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
