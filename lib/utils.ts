/** Primeiro nome pra saudação do dashboard — "Matheus Proensa" -> "Matheus". */
export function primeiroNome(nomeCompleto: string): string {
  return nomeCompleto.trim().split(" ")[0] || nomeCompleto;
}

const ORDEM_TURMAS = [
  "Berçário I", "Berçário II", "Maternal I", "Maternal II",
  "Pré-escola I", "Pré-escola II", "1º Ano", "2º Ano", "3º Ano",
  "Contraturno I", "Contraturno II", "Contraturno III", "Contraturno IV", "Contraturno V",
];

export function ordenarTurmas<T extends { nome: string }>(turmas: T[]): T[] {
  return [...turmas].sort((a, b) => {
    const ia = ORDEM_TURMAS.indexOf(a.nome);
    const ib = ORDEM_TURMAS.indexOf(b.nome);
    if (ia === -1 && ib === -1) return a.nome.localeCompare(b.nome, "pt-BR");
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

export const SETORES = [
  "Direção",
  "Coordenação",
  "Secretaria",
  "Financeiro",
  "Pedagógico",
  "Nutrição",
  "Cozinha",
  "Serviços Gerais",
  "Marketing",
  "Administrativo",
];

export function agruparPorSetor<T extends { setor: string }>(funcionarios: T[]): { setor: string; itens: T[] }[] {
  const porSetor = new Map<string, T[]>();
  for (const f of funcionarios) {
    if (!porSetor.has(f.setor)) porSetor.set(f.setor, []);
    porSetor.get(f.setor)!.push(f);
  }
  return Array.from(porSetor.entries())
    .map(([setor, itens]) => ({ setor, itens }))
    .sort((a, b) => {
      const ia = SETORES.indexOf(a.setor);
      const ib = SETORES.indexOf(b.setor);
      if (ia === -1 && ib === -1) return a.setor.localeCompare(b.setor, "pt-BR");
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
}

export const CATEGORIAS_DOCUMENTO = ["Legalização", "Contratos", "RH", "Institucional"];

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "2026-08" -> "ago/2026". Estava duplicada, letra por letra, em BoletosTable
 * e NotasFiscaisTable (achado da auditoria ago/2026). */
export function formatarCompetencia(competencia: string): string {
  const [ano, mes] = competencia.split("-");
  const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const idx = Number(mes) - 1;
  return idx >= 0 && idx < 12 ? `${MESES[idx]}/${ano}` : competencia;
}

export function formatarData(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function formatarDataHora(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  // Fuso fixo explícito: sem isso, o servidor (Vercel, geralmente UTC) e o
  // navegador de quem acessa (horário do Brasil) formatam a MESMA data como
  // textos diferentes — e como esse valor entra no HTML renderizado no
  // servidor (lista de conversas do chat), a diferença de texto faz o React
  // detectar "hydration mismatch" (erro #418) assim que a página carrega.
  // Esse erro deixa a página numa reconciliação quebrada: cliques continuam
  // mudando a URL (browser puro), mas o estado do React para de refletir na
  // tela — exatamente o "preciso clicar 2x" que vinha sendo reportado no chat.
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function formatarCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function formatarTelefone(telefone: string): string {
  const digits = telefone.replace(/\D/g, "");
  if (digits.length === 11) return digits.replace(/(\d{2})(\d)(\d{4})(\d{4})/, "($1) $2 $3-$4");
  if (digits.length === 10) return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return telefone;
}

/** Link "wa.me" pra chamar no WhatsApp direto — telefone é salvo só com DDD (10/11
 * dígitos, sem +55), o wa.me precisa do código do país na frente. */
export function linkWhatsApp(telefone: string): string {
  const digits = telefone.replace(/\D/g, "");
  const comPais = digits.startsWith("55") && digits.length > 11 ? digits : `55${digits}`;
  return `https://wa.me/${comPais}`;
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Categórica (handoff de design, etapa 3.7): 6 tokens em vez de 7 hex soltos —
// sai o vermelho, ninguém deve ter avatar "de erro" (cor exclusiva de estado).
const CORES_AVATAR = [
  "var(--cat-1-dot)",
  "var(--cat-2-dot)",
  "var(--cat-3-dot)",
  "var(--cat-4-dot)",
  "var(--cat-5-dot)",
  "var(--cat-6-dot)",
];

export function corAvatar(nome: string): string {
  let hash = 0;
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash);
  return CORES_AVATAR[Math.abs(hash) % CORES_AVATAR.length];
}

export function diasEmAtraso(vencimento: Date | string): number {
  const venc = typeof vencimento === "string" ? new Date(vencimento) : vencimento;
  const hoje = new Date();
  const diff = hoje.getTime() - venc.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}
