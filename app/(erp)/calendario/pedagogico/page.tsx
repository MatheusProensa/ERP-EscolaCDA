import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { CalendarioCompleto } from "@/components/modules/calendario/CalendarioCompleto";
import { podeEditarModulo } from "@/lib/permissoes";
import { EscutaAoVivo } from "@/components/ui/EscutaAoVivo";

/** Calendário Pedagógico — pedido do dono, out/2026: idêntico ao Calendário
 * Geral (mesmo componente, mesma permissão — /calendario/pedagogico cai no
 * mesmo setor "calendario" da grade, via prefixo), só esconde a categoria
 * Marketing (pill e eventos) via a prop ocultarCategoria. */
export default async function CalendarioPedagogicoPage() {
  const session = await auth();
  const podeEditar = podeEditarModulo("/calendario/pedagogico", session?.user.role ?? "", session?.user.permissoes);

  return (
    <div>
      <EscutaAoVivo modulo="calendario" />
      <PageHeader
        title="Calendário Pedagógico"
        subtitle="Agenda organizacional da escola — eventos, reuniões, datas comemorativas, recessos e feriados"
      />
      <CalendarioCompleto podeEditar={podeEditar} ocultarCategoria="Marketing" />
    </div>
  );
}
