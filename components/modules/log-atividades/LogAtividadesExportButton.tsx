"use client";

import { Download, FileDown, FileText } from "lucide-react";
import { MenuButton, type MenuButtonItem } from "@/components/ui/MenuButton";

function url(filtros: { busca?: string; entidade?: string }, extra: Record<string, string>) {
  const params = new URLSearchParams({ ...(filtros.busca ? { busca: filtros.busca } : {}), ...(filtros.entidade ? { entidade: filtros.entidade } : {}), ...extra });
  const query = params.toString();
  return `/api/relatorios/log-atividades${query ? `?${query}` : ""}`;
}

/** Exporta respeitando o filtro atual da tela (busca/tipo) — sem paginação,
 * traz tudo que bate com o filtro de uma vez. */
export function LogAtividadesExportButton({ busca, entidade }: { busca?: string; entidade?: string }) {
  const items: MenuButtonItem[] = [
    { label: "Exportar filtro — PDF", icon: FileText, href: url({ busca, entidade }, { formato: "pdf" }) },
    { label: "Exportar filtro — CSV", icon: Download, href: url({ busca, entidade }, {}) },
  ];
  return <MenuButton label="Exportar" icon={FileDown} variant="outline" items={items} />;
}
