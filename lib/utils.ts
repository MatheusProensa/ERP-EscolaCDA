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

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarData(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function formatarDataHora(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  return d.toLocaleString("pt-BR");
}

export function formatarCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function formatarTelefone(telefone: string): string {
  const digits = telefone.replace(/\D/g, "");
  if (digits.length === 11) return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (digits.length === 10) return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return telefone;
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

const CORES_AVATAR = [
  "#1A6FD8",
  "#16A34A",
  "#D97706",
  "#DC2626",
  "#7C3AED",
  "#0D9488",
  "#DB2777",
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
