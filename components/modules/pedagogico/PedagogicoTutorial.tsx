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
    texto: 'No card da sua turma, toque em "Planejamento" pra abrir o projeto pedagógico da turma e preencher a semana, dia a dia, do jeito que você já monta hoje.',
    icon: NotebookPen,
  },
  {
    titulo: "Parecer guiado por parágrafo",
    texto: 'Em "Parecer", você monta o modelo de parágrafos da sua turma uma vez — cada um já vem com uma pergunta pra te ajudar a escrever — e depois é só entrar em cada aluno.',
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
