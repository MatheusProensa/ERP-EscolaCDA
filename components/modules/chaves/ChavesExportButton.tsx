"use client";

import { Download, FileDown, FileText } from "lucide-react";
import { MenuButton, type MenuButtonItem } from "@/components/ui/MenuButton";

const items: MenuButtonItem[] = [
  { label: "Histórico — PDF", icon: FileText, href: "/api/relatorios/chaves?formato=pdf" },
  { label: "Histórico — CSV", icon: Download, href: "/api/relatorios/chaves" },
];

/** Exporta o histórico completo de empréstimo (quem pegou cada chave, quando
 * pegou e devolveu) — diferente da tela, que só mostra quem está com a chave
 * agora. */
export function ChavesExportButton() {
  return <MenuButton label="Exportar histórico" icon={FileDown} variant="outline" items={items} />;
}
