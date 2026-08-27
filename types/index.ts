import type { Aluno, Matricula, Turma } from "@prisma/client";

export type MatriculaComAluno = Matricula & {
  aluno: Aluno;
  turma: Turma;
};

export type BadgeVariant = "green" | "red" | "amber" | "blue" | "purple" | "gray";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
};
