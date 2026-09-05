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

/** Cor do badge de perfil na tela de Usuários — dá pra reconhecer o setor de
 * cada pessoa num relance, sem precisar ler o texto. Categórica (handoff de
 * design, etapa 3.8): papel de acesso é categoria, não estado. */
export const ROLE_BADGE_VARIANT: Record<string, "cat1" | "cat2" | "cat3" | "cat4" | "cat5" | "cat6"> = {
  ADMIN: "cat3",
  DIRECAO: "cat1",
  SECRETARIA: "cat6",
  FINANCEIRO: "cat2",
  PEDAGOGICO: "cat5",
  ADMINISTRATIVO: "cat6",
};

export const GESTAO: RoleAtiva[] = ["ADMIN", "DIRECAO"];
// Log de Atividades expõe quem mudou o quê no sistema inteiro — só o Admin (Matheus) vê,
// nem Direção, a pedido explícito dele. Não é um módulo com permissão por pessoa: é
// fixo, não aparece na tela de "Permissões por setor".
const SOMENTE_ADMIN: RoleAtiva[] = ["ADMIN"];
const FINANCEIRO: RoleAtiva[] = ["ADMIN", "DIRECAO", "FINANCEIRO"];
const PEDAGOGICO: RoleAtiva[] = ["ADMIN", "DIRECAO", "PEDAGOGICO"];
const ADMINISTRATIVO: RoleAtiva[] = ["ADMIN", "DIRECAO", "ADMINISTRATIVO"];
// Aniversariantes mistura alunos (Pedagógico) e funcionários (Administrativo).
// Interessados (funil de pré-matrícula) usa o mesmo pacote — é conduzido pela
// secretaria (Administrativo) mas é fundamentalmente sobre futuros alunos.
const ANIVERSARIANTES: RoleAtiva[] = ["ADMIN", "DIRECAO", "PEDAGOGICO", "ADMINISTRATIVO"];

// Regras de acesso por prefixo de rota (páginas e APIs) — o pacote padrão que
// cada Role já libera. A rota mais específica (prefixo mais longo) que bater
// vence — por isso as rotas de /api/relatorios/* aparecem antes de regras
// mais genéricas.
const REGRAS_ACESSO: { prefixo: string; roles: RoleAtiva[] }[] = [
  // Páginas
  { prefixo: "/alunos", roles: PEDAGOGICO },
  { prefixo: "/academico", roles: PEDAGOGICO },
  { prefixo: "/cardapio", roles: PEDAGOGICO },
  { prefixo: "/aniversariantes", roles: ANIVERSARIANTES },
  { prefixo: "/interessados", roles: ANIVERSARIANTES },
  { prefixo: "/funcionarios", roles: ADMINISTRATIVO },
  { prefixo: "/horarios-equipe", roles: ADMINISTRATIVO },
  { prefixo: "/estoque", roles: ADMINISTRATIVO },
  { prefixo: "/chaves", roles: ADMINISTRATIVO },
  { prefixo: "/ponto", roles: FINANCEIRO },
  { prefixo: "/notas-fiscais", roles: FINANCEIRO },
  { prefixo: "/boletos", roles: FINANCEIRO },
  { prefixo: "/documentos", roles: GESTAO },
  { prefixo: "/usuarios", roles: GESTAO },
  { prefixo: "/log-atividades", roles: SOMENTE_ADMIN },
  { prefixo: "/api/relatorios/log-atividades", roles: SOMENTE_ADMIN },

  // APIs
  { prefixo: "/api/relatorios/alunos", roles: PEDAGOGICO },
  { prefixo: "/api/relatorios/chamada", roles: PEDAGOGICO },
  { prefixo: "/api/relatorios/aniversariantes", roles: ANIVERSARIANTES },
  { prefixo: "/api/relatorios/estoque", roles: ADMINISTRATIVO },
  { prefixo: "/api/relatorios/funcionarios", roles: ADMINISTRATIVO },
  { prefixo: "/api/relatorios/funcionarios-contatos", roles: ADMINISTRATIVO },
  { prefixo: "/api/relatorios/cardapio", roles: PEDAGOGICO },
  { prefixo: "/api/relatorios/horarios-equipe", roles: ADMINISTRATIVO },
  { prefixo: "/api/relatorios/ponto", roles: FINANCEIRO },
  { prefixo: "/api/ponto", roles: FINANCEIRO },
  { prefixo: "/api/notas-fiscais", roles: FINANCEIRO },
  { prefixo: "/api/boletos", roles: FINANCEIRO },
  { prefixo: "/api/relatorios/notas-fiscais", roles: FINANCEIRO },
  { prefixo: "/api/relatorios/boletos", roles: FINANCEIRO },
  { prefixo: "/api/documentos", roles: GESTAO },
  { prefixo: "/api/alunos", roles: PEDAGOGICO },
  { prefixo: "/api/matriculas", roles: PEDAGOGICO },
  { prefixo: "/api/interessados", roles: ANIVERSARIANTES },
  { prefixo: "/api/relatorios/interessados", roles: ANIVERSARIANTES },
  { prefixo: "/api/responsaveis", roles: PEDAGOGICO },
  { prefixo: "/api/turmas", roles: PEDAGOGICO },
  { prefixo: "/api/cardapio", roles: PEDAGOGICO },
  { prefixo: "/api/contratos", roles: PEDAGOGICO },
  { prefixo: "/api/funcionarios", roles: ADMINISTRATIVO },
  { prefixo: "/api/horarios-equipe", roles: ADMINISTRATIVO },
  { prefixo: "/api/estoque", roles: ADMINISTRATIVO },
  { prefixo: "/api/chaves", roles: ADMINISTRATIVO },
  { prefixo: "/api/relatorios/chaves", roles: ADMINISTRATIVO },
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

// ---------------------------------------------------------------------------
// Permissão granular por pessoa/setor — sobrepõe o pacote padrão do Role
// acima quando o Admin configurou algo específico pra aquela pessoa naquele
// módulo (tela "Permissões por setor" em /usuarios/[id]). Guardado como
// PermissaoUsuario no banco, embutido no token de sessão no login (não é
// checado no banco a cada requisição — troca de permissão só vale depois
// de um novo login, igual já acontece hoje com troca de Role).
export type NivelPermissao = "NENHUM" | "VER" | "EDITAR";
export type PermissoesPorModulo = Record<string, NivelPermissao>;

/** Cada setor que aparece na tela de Permissões — chave usada tanto no banco
 * quanto pra reconhecer a que módulo uma rota pertence. */
export const MODULOS: { chave: string; label: string; prefixos: string[] }[] = [
  { chave: "alunos", label: "Alunos", prefixos: ["/alunos", "/api/alunos", "/api/matriculas", "/api/responsaveis", "/api/contratos", "/api/relatorios/alunos", "/api/relatorios/chamada"] },
  { chave: "calendario", label: "Calendário", prefixos: ["/calendario", "/api/eventos"] },
  { chave: "academico", label: "Acadêmico", prefixos: ["/academico", "/api/turmas"] },
  { chave: "cardapio", label: "Cardápio", prefixos: ["/cardapio", "/api/cardapio", "/api/relatorios/cardapio"] },
  { chave: "aniversariantes", label: "Aniversariantes", prefixos: ["/aniversariantes", "/api/relatorios/aniversariantes"] },
  { chave: "interessados", label: "Interessados", prefixos: ["/interessados", "/api/interessados", "/api/relatorios/interessados"] },
  { chave: "funcionarios", label: "Funcionários", prefixos: ["/funcionarios", "/api/funcionarios", "/api/relatorios/funcionarios", "/api/relatorios/funcionarios-contatos"] },
  { chave: "horarios-equipe", label: "Horários da Equipe", prefixos: ["/horarios-equipe", "/api/horarios-equipe", "/api/relatorios/horarios-equipe"] },
  { chave: "estoque", label: "Estoque", prefixos: ["/estoque", "/api/estoque", "/api/relatorios/estoque"] },
  { chave: "chaves", label: "Chaves", prefixos: ["/chaves", "/api/chaves", "/api/relatorios/chaves"] },
  { chave: "ponto", label: "Ponto", prefixos: ["/ponto", "/api/ponto", "/api/relatorios/ponto"] },
  { chave: "notas-fiscais", label: "Notas Fiscais", prefixos: ["/notas-fiscais", "/api/notas-fiscais", "/api/relatorios/notas-fiscais"] },
  { chave: "boletos", label: "Boletos", prefixos: ["/boletos", "/api/boletos", "/api/relatorios/boletos"] },
  { chave: "documentos", label: "Documentos", prefixos: ["/documentos", "/api/documentos"] },
  { chave: "usuarios", label: "Usuários", prefixos: ["/usuarios", "/api/usuarios", "/api/backup"] },
];

function moduloDaRota(pathname: string): string | null {
  let melhor: { chave: string; prefixo: string } | null = null;
  for (const modulo of MODULOS) {
    for (const prefixo of modulo.prefixos) {
      const bate = pathname === prefixo || pathname.startsWith(`${prefixo}/`);
      if (bate && (!melhor || prefixo.length > melhor.prefixo.length)) {
        melhor = { chave: modulo.chave, prefixo };
      }
    }
  }
  return melhor?.chave ?? null;
}

const METODOS_LEITURA = new Set(["GET", "HEAD", "OPTIONS"]);

/** Versão da checagem de acesso que considera método HTTP + permissão
 * granular por pessoa. Pedido explícito do dono do sistema (ago/2026): pros
 * setores que aparecem na grade (MODULOS), o Perfil/Role NÃO decide mais nada
 * — só a grade. Sem marcação nenhuma pra esse setor = sem acesso, ponto,
 * mesmo que o Perfil dela normalmente desse. ADMIN continua vendo tudo
 * (senão ninguém consegue nem abrir a tela de Usuários pra configurar a
 * grade de mais ninguém). Rota que não é nenhum dos setores da grade
 * (Dashboard, Mural, Chat, Log de Atividades...) continua pelo pacote do
 * Role de sempre — essas nunca fizeram parte da grade. Calendário entrou na
 * grade em set/2026 — todo usuário existente na época recebeu "Ler e
 * editar" junto com a migração, pra ninguém perder acesso sem querer. */
export function acessoPermitido(
  pathname: string,
  method: string,
  role: string,
  overrides?: PermissoesPorModulo
): boolean {
  if (role === "ADMIN") return true;

  const modulo = moduloDaRota(pathname);
  if (modulo) {
    const override = overrides?.[modulo];
    if (override === "VER") return METODOS_LEITURA.has(method.toUpperCase());
    return override === "EDITAR"; // só EDITAR libera; NENHUM, HERDAR ou sem marcação = sem acesso
  }

  return rotaPermitida(pathname, role);
}

/** Pra filtrar itens do menu lateral — só precisa saber se a pessoa enxerga
 * a página (GET), não se pode editar. */
export function podeVerModulo(pathname: string, role: string, overrides?: PermissoesPorModulo): boolean {
  return acessoPermitido(pathname, "GET", role, overrides);
}
