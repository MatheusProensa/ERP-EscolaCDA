import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { CalendarioCompleto } from "@/components/modules/calendario/CalendarioCompleto";
import { ExportarCalendarioPdfModal } from "@/components/modules/calendario/ExportarCalendarioPdfModal";
import { podeEditarModulo } from "@/lib/permissoes";

export default async function CalendarioPage() {
  const session = await auth();
  // Achado real (set/2026, mesma revisão do Cardápio): esse check olhava só o
  // Role (ADMIN/DIRECAO), ignorando a grade — Calendário entrou na grade de
  // permissões por pessoa em set/2026 e essa tela nunca foi atualizada junto.
  // Dois problemas: alguém de outro Role com EDITAR liberado na grade via só
  // "visualizar" aqui (perde ação que deveria ter); e, o inverso e mais
  // grave, DIRECAO com a grade restringindo Calendário a "Só visualizar"
  // ainda aparecia como podendo editar, só por causa do Role.
  const podeEditar = podeEditarModulo("/calendario", session?.user.role ?? "", session?.user.permissoes);

  return (
    <div>
      <PageHeader
        title="Calendário"
        subtitle="Agenda organizacional da escola — eventos, reuniões, datas comemorativas, recessos e feriados"
        action={<ExportarCalendarioPdfModal />}
      />
      <CalendarioCompleto podeEditar={podeEditar} />
    </div>
  );
}
