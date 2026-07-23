import type { DocumentoCategoria } from "@prisma/client";

export const CATEGORIAS_DOCUMENTO: { value: DocumentoCategoria; label: string }[] = [
  { value: "LEGALIZACAO", label: "Legalização" },
  { value: "FINANCEIRO", label: "Financeiro" },
  { value: "RH", label: "RH / Pessoal" },
  { value: "CONTRATOS", label: "Contratos" },
  { value: "INSTITUCIONAL", label: "Institucional" },
];

export function labelCategoria(categoria: DocumentoCategoria): string {
  return CATEGORIAS_DOCUMENTO.find((c) => c.value === categoria)?.label ?? categoria;
}
