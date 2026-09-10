import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { EscutaAoVivo } from "@/components/ui/EscutaAoVivo";
import { podeEditarModulo } from "@/lib/permissoes";
import { buscarTurmasComConfirmacoes, eventoFamiliaAtualOuNovo } from "@/lib/festaFamilia";
import { FestaFamiliaPainel } from "@/components/modules/festa-familia/FestaFamiliaPainel";

export default async function FestaFamiliaPage() {
  const session = await auth();
  const podeEditar = podeEditarModulo("/festa-familia", session?.user.role ?? "", session?.user.permissoes);

  const evento = await eventoFamiliaAtualOuNovo();

  return (
    <div>
      <EscutaAoVivo modulo="festa-familia" />
      <PageHeader
        title="Festa da Família"
        subtitle={
          evento
            ? `Confirmações de presença — ${evento.nome}`
            : "Confirmações de presença por turma"
        }
      />

      {!evento ? (
        <EmptyState title="Nenhum ano letivo ativo." subtitle="Marque um ano letivo como ativo em Acadêmico pra começar a controlar as confirmações." />
      ) : (
        <FestaFamiliaConteudo eventoId={evento.id} anoLetivoId={evento.anoLetivoId} podeEditar={podeEditar} />
      )}
    </div>
  );
}

async function FestaFamiliaConteudo({
  eventoId,
  anoLetivoId,
  podeEditar,
}: {
  eventoId: string;
  anoLetivoId: string;
  podeEditar: boolean;
}) {
  const turmas = await buscarTurmasComConfirmacoes(anoLetivoId, eventoId);

  if (turmas.every((t) => t.alunos.length === 0)) {
    return <EmptyState title="Nenhum aluno matriculado no ano letivo atual." />;
  }

  return <FestaFamiliaPainel eventoId={eventoId} turmasIniciais={turmas} podeEditar={podeEditar} />;
}
