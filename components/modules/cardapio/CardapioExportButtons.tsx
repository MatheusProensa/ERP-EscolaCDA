"use client";

import { Download, FileDown, FileText } from "lucide-react";
import { MenuButton, type MenuButtonItem } from "@/components/ui/MenuButton";
import { PUBLICOS_CARDAPIO } from "./constants";

function url(ano: number, mes: number, extra: Record<string, string>) {
  const params = new URLSearchParams({ ano: String(ano), mes: String(mes), ...extra });
  return `/api/relatorios/cardapio?${params.toString()}`;
}

/** Exporta o cardápio do mês — completo (os 3 públicos juntos, um por
 * página) ou só um público específico, em PDF (com timbrado) ou CSV. */
export function CardapioExportButtons({ ano, mes }: { ano: number; mes: number }) {
  const items: MenuButtonItem[] = [
    { label: "Cardápio completo — PDF", icon: FileText, href: url(ano, mes, { formato: "pdf" }) },
    { label: "Cardápio completo — CSV", icon: Download, href: url(ano, mes, {}) },
    ...PUBLICOS_CARDAPIO.flatMap((p): MenuButtonItem[] => [
      { label: `${p.label} — PDF`, icon: FileText, href: url(ano, mes, { publico: p.valor, formato: "pdf" }) },
    ]),
  ];

  return <MenuButton label="Exportar" icon={FileDown} variant="outline" items={items} />;
}
