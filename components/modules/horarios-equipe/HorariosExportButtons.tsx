"use client";

import { Download, FileDown, FileText } from "lucide-react";
import { MenuButton, type MenuButtonItem } from "@/components/ui/MenuButton";

function url(ano: number, extra: Record<string, string>) {
  const params = new URLSearchParams({ ano: String(ano), ...extra });
  return `/api/relatorios/horarios-equipe?${params.toString()}`;
}

/** Exporta a escala do ano — PDF com o timbrado oficial (igual ao Cardápio)
 * ou CSV. */
export function HorariosExportButtons({ ano }: { ano: number }) {
  const items: MenuButtonItem[] = [
    { label: "Horários — PDF", icon: FileText, href: url(ano, { formato: "pdf" }) },
    { label: "Horários — CSV", icon: Download, href: url(ano, {}) },
  ];

  return <MenuButton label="Exportar" icon={FileDown} variant="outline" items={items} />;
}
