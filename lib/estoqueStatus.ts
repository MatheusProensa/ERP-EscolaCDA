export type StatusEstoque = "ok" | "baixa" | "crit" | "zero";

export function statusEstoque(quantidade: number, minimo: number): StatusEstoque {
  if (quantidade <= 0) return "zero";
  if (quantidade <= minimo * 0.5) return "crit";
  if (quantidade <= minimo) return "baixa";
  return "ok";
}

export const STATUS_ESTOQUE_INFO: Record<StatusEstoque, { label: string; cor: string; tint: string }> = {
  ok: { label: "Normal", cor: "#16A34A", tint: "#16A34A1A" },
  baixa: { label: "Atenção", cor: "#D97706", tint: "#D977061A" },
  crit: { label: "Crítico", cor: "#EA580C", tint: "#EA580C1A" },
  zero: { label: "Zerado", cor: "#DC2626", tint: "#DC26261A" },
};

const CATEGORIA_ICONES: { termos: string[]; icone: string; cor: string }[] = [
  { termos: ["material escolar", "escolar", "expediente", "papelaria"], icone: "PenLine", cor: "#1A6FD8" },
  { termos: ["limpeza"], icone: "SprayCan", cor: "#16A34A" },
  { termos: ["higiene"], icone: "Droplets", cor: "#0D9488" },
  { termos: ["cozinha", "copa", "alimenta"], icone: "Coffee", cor: "#B5701A" },
  { termos: ["informática", "informatica", "tecnologia"], icone: "Printer", cor: "#7C3AED" },
  { termos: ["manutenção", "manutencao", "ferramenta"], icone: "Wrench", cor: "#5C6F8A" },
  { termos: ["saúde", "saude", "epi", "segurança", "seguranca"], icone: "HardHat", cor: "#A8506B" },
];

export function categoriaVisual(categoria: string): { icone: string; cor: string } {
  const alvo = categoria.toLowerCase();
  const encontrado = CATEGORIA_ICONES.find((c) => c.termos.some((t) => alvo.includes(t)));
  return encontrado ? { icone: encontrado.icone, cor: encontrado.cor } : { icone: "Package", cor: "#5A6A85" };
}
