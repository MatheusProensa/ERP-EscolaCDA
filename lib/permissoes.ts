export const ROLES_ATIVAS = ["ADMIN", "DIRECAO", "FINANCEIRO", "PEDAGOGICO", "ADMINISTRATIVO"] as const;
export type RoleAtiva = (typeof ROLES_ATIVAS)[number];

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  DIRECAO: "Direção",
  SECRETARIA: "Secretaria",
  FINANCEIRO: "Financeiro",
  PEDAGOGICO: "Pedagógico",
  ADMINISTRATIVO: "Administrativo",
};

export const GESTAO: RoleAtiva[] = ["ADMIN", "DIRECAO"];
// Log de Atividades expõe quem mudou o quê no sistema inteiro — só o Admin (Matheus) vê,
// nem Direção, a pedido explícito dele.
const SOMENTE_ADMIN: RoleAtiva[] = ["ADMIN"];
const FINANCEIRO: RoleAtiva[] = ["ADMIN", "DIRECAO", "FINANCEIRO"];
const PEDAGOGICO: RoleAtiva[] = ["ADMIN", "DIRECAO", "PEDAGOGICO"];
const ADMINISTRATIVO: RoleAtiva[] = ["ADMIN", "DIRECAO", "ADMINISTRATIVO"];
// Aniversariantes mistura alunos (Pedagógico) e funcionários (Administrativo).
const ANIVERSARIANTES: RoleAtiva[] = ["ADMIN", "DIRECAO", "PEDAGOGICO", "ADMINISTRATIVO"];

// Regras de acesso por prefixo de rota (páginas e APIs). A rota mais específica
// (prefixo mais longo) que bater vence — por isso as rotas de /api/relatorios/*
// aparecem antes de regras mais genéricas.
const REGRAS_ACESSO: { prefixo: string; roles: RoleAtiva[] }[] = [
  // Páginas
  { prefixo: "/alunos", roles: PEDAGOGICO },
  { prefixo: "/academico", roles: PEDAGOGICO },
  { prefixo: "/cardapio", roles: PEDAGOGICO },
  { prefixo: "/aniversariantes", roles: ANIVERSARIANTES },
  { prefixo: "/funcionarios", roles: ADMINISTRATIVO },
  { prefixo: "/estoque", roles: ADMINISTRATIVO },
  { prefixo: "/chaves", roles: ADMINISTRATIVO },
  { prefixo: "/ponto", roles: FINANCEIRO },
  { prefixo: "/notas-fiscais", roles: FINANCEIRO },
  { prefixo: "/boletos", roles: FINANCEIRO },
  { prefixo: "/documentos", roles: GESTAO },
  { prefixo: "/usuarios", roles: GESTAO },
  { prefixo: "/log-atividades", roles: SOMENTE_ADMIN },

  // APIs
  { prefixo: "/api/relatorios/alunos", roles: PEDAGOGICO },
  { prefixo: "/api/relatorios/chamada", roles: PEDAGOGICO },
  { prefixo: "/api/relatorios/aniversariantes", roles: ANIVERSARIANTES },
  { prefixo: "/api/relatorios/estoque", roles: ADMINISTRATIVO },
  { prefixo: "/api/relatorios/ponto", roles: FINANCEIRO },
  { prefixo: "/api/ponto", roles: FINANCEIRO },
  { prefixo: "/api/notas-fiscais", roles: FINANCEIRO },
  { prefixo: "/api/boletos", roles: FINANCEIRO },
  { prefixo: "/api/documentos", roles: GESTAO },
  { prefixo: "/api/alunos", roles: PEDAGOGICO },
  { prefixo: "/api/matriculas", roles: PEDAGOGICO },
  { prefixo: "/api/lista-espera", roles: PEDAGOGICO },
  { prefixo: "/api/responsaveis", roles: PEDAGOGICO },
  { prefixo: "/api/turmas", roles: PEDAGOGICO },
  { prefixo: "/api/cardapio", roles: PEDAGOGICO },
  { prefixo: "/api/contratos", roles: PEDAGOGICO },
  { prefixo: "/api/funcionarios", roles: ADMINISTRATIVO },
  { prefixo: "/api/estoque", roles: ADMINISTRATIVO },
  { prefixo: "/api/chaves", roles: ADMINISTRATIVO },
  { prefixo: "/api/usuarios", roles: GESTAO },
  { prefixo: "/api/backup", roles: GESTAO },
];

/** Rotas sem regra explícita (ex.: /dashboard) ficam liberadas pra qualquer usuário logado. */
export function rotaPermitida(pathname: string, role: string): boolean {
  let melhorRegra: (typeof REGRAS_ACESSO)[number] | null = null;
  for (const regra of REGRAS_ACESSO) {
    const bate = pathname === regra.prefixo || pathname.startsWith(`${regra.prefixo}/`);
    if (bate && (!melhorRegra || regra.prefixo.length > melhorRegra.prefixo.length)) {
      melhorRegra = regra;
    }
  }
  if (!melhorRegra) return true;
  return (melhorRegra.roles as string[]).includes(role);
}
