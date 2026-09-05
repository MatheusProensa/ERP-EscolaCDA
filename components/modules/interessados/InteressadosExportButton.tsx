"use client";

import { Download, FileDown, FileText } from "lucide-react";
import { MenuButton, type MenuButtonItem } from "@/components/ui/MenuButton";

const items: MenuButtonItem[] = [
  { label: "Interessados — PDF", icon: FileText, href: "/api/relatorios/interessados?formato=pdf" },
  { label: "Interessados — CSV", icon: Download, href: "/api/relatorios/interessados" },
];

/** Exporta o funil inteiro (sem os filtros da tabela, que são só visuais) —
 * PDF com o timbrado oficial ou CSV. */
export function InteressadosExportButton() {
  return <MenuButton label="Exportar" icon={FileDown} variant="outline" items={items} />;
}
