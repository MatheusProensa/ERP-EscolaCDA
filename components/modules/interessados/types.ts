import type { StatusListaEspera } from "@prisma/client";

export type ItemInteressado = {
  id: string;
  nomeCrianca: string;
  foto: string | null;
  dataNascimento: Date | null;
  nomeResponsavel: string;
  parentescoContato: string | null;
  telefoneResponsavel: string;
  emailResponsavel: string | null;
  turmaDesejadaId: string | null;
  interesseTexto: string | null;
  dataPrimeiroContato: Date | null;
  dataVisita: Date | null;
  oQueBusca: string | null;
  observacoes: string | null;
  status: StatusListaEspera;
  createdAt: Date;
  turmaDesejada: { nome: string } | null;
};
