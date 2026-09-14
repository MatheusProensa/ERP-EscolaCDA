"use client";

import { GraduationCap, NotebookPen, FileText, Image as ImageIcon } from "lucide-react";
import { TutorialGuiado } from "@/components/ui/TutorialGuiado";

// Os ícones (componentes/função) precisam ser criados AQUI DENTRO do client
// component, não recebidos como prop vindos de um Server Component — passar
// função de servidor pra client component quebra em produção ("Functions
// cannot be passed directly to Client Components"), bug real visto no
// runtime depois do deploy do tutorial.
const PASSOS = [
  {
    titulo: "Bem-vinda à Área Pedagógica!",
    texto: "Aqui você acompanha suas turmas e entrega planejamento, parecer e portfólio — tudo num lugar só, sem precisar de PDF ou pasta separada.",
    icon: GraduationCap,
  },
  {
    titulo: "Planejamento semanal",
    texto: 'No card da sua turma, toque em "Planejamento" pra escolher o tema da semana (se a coordenação já preparou um) e preencher o que vai ter em cada dia.',
    icon: NotebookPen,
  },
  {
    titulo: "Parecer guiado por parágrafo",
    texto: 'Em "Parecer", cada parágrafo já vem com uma pergunta pra te ajudar a escrever — não precisa abrir nenhum PDF de orientação do lado.',
    icon: FileText,
  },
  {
    titulo: "Portfólio com fotos",
    texto: 'Em "Portfólio", é só arrastar a foto pra tela (ou tocar pra abrir a câmera/galeria do tablet) e escrever uma legenda curta.',
    icon: ImageIcon,
  },
];

export function PedagogicoTutorial() {
  return <TutorialGuiado modulo="pedagogico" titulo="Como usar a Área Pedagógica" passos={PASSOS} />;
}
