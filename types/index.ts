import type { Aluno, Responsavel, Matricula, Turma, Mensalidade, Pagamento } from "@prisma/client";

export type AlunoComRelacoes = Aluno & {
  responsaveis: Responsavel[];
  matriculas: (Matricula & {
    turma: Turma;
    mensalidades: (Mensalidade & { pagamentos: Pagamento[] })[];
  })[];
};

export type MatriculaComAluno = Matricula & {
  aluno: Aluno;
  turma: Turma;
};

export type MensalidadeComMatricula = Mensalidade & {
  matricula: Matricula & { aluno: Aluno };
};

export type BadgeVariant = "green" | "red" | "amber" | "blue" | "purple" | "gray";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
};
