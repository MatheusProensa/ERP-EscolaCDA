"use client";

import { useState, type ComponentProps } from "react";
import { FileDown, ClipboardList } from "lucide-react";
import { MenuButton } from "@/components/ui/MenuButton";
import { FichaMatriculaModal } from "./FichaMatriculaModal";

type Props = Omit<ComponentProps<typeof FichaMatriculaModal>, "open" | "onClose">;

/** Junta "Baixar PDF" (a última ficha salva, sem abrir nada) e "Editar ficha"
 * (abre o formulário, gera um PDF novo ao salvar) num menu só — antes eram
 * 2 botões grudados no cabeçalho, competindo por atenção com "Nova matrícula". */
export function FichaMatriculaAcoes({ podeEditar = true, ...props }: Props & { podeEditar?: boolean }) {
  const [editando, setEditando] = useState(false);

  return (
    <>
      <MenuButton
        label="Ficha de Matrícula"
        icon={ClipboardList}
        variant="outline"
        items={[
          { label: "Baixar PDF", icon: FileDown, href: `/api/alunos/${props.alunoId}/ficha-matricula` },
          // "Editar ficha" some pra quem só tem "Só visualizar" — baixar o PDF
          // já existente continua liberado (é leitura).
          ...(podeEditar ? [{ label: "Editar ficha", icon: ClipboardList, onClick: () => setEditando(true) }] : []),
        ]}
      />
      <FichaMatriculaModal {...props} open={editando} onClose={() => setEditando(false)} />
    </>
  );
}
