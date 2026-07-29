import { redirect } from "next/navigation";

// Turmas foi unificado com a página de Acadêmico. Mantém o redirect pra não
// quebrar links/favoritos antigos.
export default function TurmasPageRedirect() {
  redirect("/academico");
}
