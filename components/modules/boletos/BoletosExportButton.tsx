"use client";

import { Download, FileDown, FileText } from "lucide-react";
import { MenuButton, type MenuButtonItem } from "@/components/ui/MenuButton";

const items: MenuButtonItem[] = [
  { label: "Boletos — PDF", icon: FileText, href: "/api/relatorios/boletos?formato=pdf" },
  { label: "Boletos — CSV", icon: Download, href: "/api/relatorios/boletos" },
];

export function BoletosExportButton() {
  return <MenuButton label="Exportar" icon={FileDown} variant="outline" items={items} />;
}
