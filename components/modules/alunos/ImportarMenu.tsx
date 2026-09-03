"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { MenuButton } from "@/components/ui/MenuButton";
import { ImportarFichaModal } from "./ImportarFichaModal";

// Junta "Importar planilha" e "Importar ficha(s)" num botão só — eram dois botões
// separados na barra de ações da tela de Alunos, poluindo.
export function ImportarMenu({ turmas }: { turmas: { id: string; nome: string }[] }) {
  const [fichaOpen, setFichaOpen] = useState(false);

  return (
    <>
      <MenuButton
        label="Importar"
        icon={FileSpreadsheet}
        items={[
          { label: "Importar planilha", icon: FileSpreadsheet, href: "/alunos/importar" },
          { label: "Importar ficha(s) de matrícula", icon: FileText, onClick: () => setFichaOpen(true) },
        ]}
      />
      <ImportarFichaModal turmas={turmas} open={fichaOpen} onClose={() => setFichaOpen(false)} />
    </>
  );
}
