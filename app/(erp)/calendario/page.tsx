import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { CalendarioCompleto } from "@/components/modules/calendario/CalendarioCompleto";
import { ExportarCalendarioPdfModal } from "@/components/modules/calendario/ExportarCalendarioPdfModal";

export default async function CalendarioPage() {
  const session = await auth();
  const podeEditar = ["ADMIN", "DIRECAO"].includes(session?.user.role ?? "");

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
