import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { montarClausulas } from "@/lib/contratoTexto";
import { formatarData, formatarMoeda } from "@/lib/utils";
import { AssinarContratoForm } from "@/components/modules/assinatura/AssinarContratoForm";

export const metadata = { title: "Assinar contrato — Escola CDA" };

export default async function AssinarContratoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const contrato = await prisma.contrato.findUnique({ where: { tokenAssinatura: token } });
  if (!contrato || !contrato.alunoNomeSnapshot || !contrato.dataMatriculaSnapshot) notFound();

  const turnoLabel = (contrato.turnoLabelSnapshot as "Tarde" | "Integral" | "Contraturno") ?? "Tarde";
  const anoLetivo = contrato.anoLetivoSnapshot ?? new Date().getFullYear();
  const valorMensalidade = contrato.valorMensalidadeSnapshot ?? 0;

  const clausulas = montarClausulas({
    anoLetivo,
    valorMensalidade,
    turnoLabel,
    diaVencimento: contrato.diaVencimentoSnapshot ?? "",
    mesInicioVencimento: contrato.mesInicioVencimentoSnapshot ?? "",
  });

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 bg-cda-bg px-4 py-6">
      <div className="text-center">
        <p className="text-lg font-bold text-cda-navy">ESCOLA CDA</p>
        <p className="text-sm text-cda-text2">Assinatura do contrato de matrícula</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-cda-border bg-white shadow-sm">
        <div
          className="w-full bg-white bg-no-repeat"
          style={{
            paddingTop: "18.4%",
            backgroundImage: "url(/ficha-matricula-fundo.png)",
            backgroundSize: "100% auto",
            backgroundPosition: "top",
          }}
        />
        <div className="max-h-[50vh] overflow-y-auto p-4 text-[13px] leading-relaxed text-cda-text">
          <p className="mb-3 text-[15px] font-bold text-cda-text">CONTRATO DE SERVIÇOS EDUCACIONAIS {anoLetivo}</p>
          <p className="mb-1">
            <span className="font-medium">Aluno(a):</span> {contrato.alunoNomeSnapshot}
          </p>
          <p className="mb-1">
            <span className="font-medium">Data de nascimento:</span>{" "}
            {contrato.alunoNascimentoSnapshot ? formatarData(contrato.alunoNascimentoSnapshot) : "—"}
          </p>
          <p className="mb-1">
            <span className="font-medium">Turma:</span> {contrato.turmaNomeSnapshot} ({turnoLabel})
          </p>
          <p className="mb-1">
            <span className="font-medium">CONTRATANTE:</span> {contrato.responsavelNomeSnapshot || "—"}
          </p>
          <p className="mb-1">
            <span className="font-medium">CPF:</span> {contrato.responsavelCpfSnapshot || "não informado"}
          </p>
          <p className="mb-3">
            <span className="font-medium">Valor da mensalidade:</span>{" "}
            {valorMensalidade > 0 ? formatarMoeda(valorMensalidade) : "—"}
          </p>
          {clausulas.map((c, i) => (
            <p key={i} className="mb-2.5 whitespace-pre-wrap">
              {c}
            </p>
          ))}
        </div>
        <div
          className="w-full bg-white bg-no-repeat"
          style={{
            paddingTop: "3.2%",
            backgroundImage: "url(/ficha-matricula-fundo.png)",
            backgroundSize: "100% auto",
            backgroundPosition: "bottom",
          }}
        />
      </div>

      <AssinarContratoForm
        token={token}
        jaAssinado={contrato.assinado}
        nomeAssinante={contrato.nomeAssinante}
        assinadoEm={contrato.assinadoEm ? contrato.assinadoEm.toISOString() : null}
        arquivo={contrato.arquivo}
      />

      <p className="pb-4 text-center text-xs text-cda-text3">Escola CDA — Santa Maria, RS</p>
    </div>
  );
}
