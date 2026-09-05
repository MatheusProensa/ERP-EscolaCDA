"use client";

import { Download, FileDown, FileText } from "lucide-react";
import { MenuButton, type MenuButtonItem } from "@/components/ui/MenuButton";

const items: MenuButtonItem[] = [
  { label: "Notas Fiscais — PDF", icon: FileText, href: "/api/relatorios/notas-fiscais?formato=pdf" },
  { label: "Notas Fiscais — CSV", icon: Download, href: "/api/relatorios/notas-fiscais" },
];

export function NotasFiscaisExportButton() {
  return <MenuButton label="Exportar" icon={FileDown} variant="outline" items={items} />;
}
