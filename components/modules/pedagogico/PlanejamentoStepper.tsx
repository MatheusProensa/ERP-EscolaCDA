import { Check, X } from "lucide-react";

type EstadoEtapa = "concluida" | "atual" | "pendente" | "erro";
type Etapa = { label: string; estado: EstadoEtapa };

const COR: Record<EstadoEtapa, { bg: string; borda: string; texto: string }> = {
  concluida: { bg: "var(--status-info)", borda: "var(--status-info)", texto: "var(--cda-text)" },
  atual: { bg: "#fff", borda: "var(--status-info)", texto: "var(--status-info)" },
  pendente: { bg: "#fff", borda: "var(--cda-border)", texto: "var(--cda-text3)" },
  erro: { bg: "var(--status-danger)", borda: "var(--status-danger)", texto: "var(--status-danger)" },
};

function calcularEtapas(status: "RASCUNHO" | "ENVIADO" | "APROVADO" | "DEVOLVIDO"): Etapa[] {
  if (status === "RASCUNHO") {
    return [
      { label: "Preenchendo", estado: "atual" },
      { label: "Enviado", estado: "pendente" },
      { label: "Em revisão", estado: "pendente" },
      { label: "Aprovado", estado: "pendente" },
    ];
  }
  if (status === "ENVIADO") {
    return [
      { label: "Preenchendo", estado: "concluida" },
      { label: "Enviado", estado: "concluida" },
      { label: "Em revisão", estado: "atual" },
      { label: "Aprovado", estado: "pendente" },
    ];
  }
  if (status === "DEVOLVIDO") {
    return [
      { label: "Preenchendo", estado: "concluida" },
      { label: "Enviado", estado: "concluida" },
      { label: "Devolvido", estado: "erro" },
      { label: "Aprovado", estado: "pendente" },
    ];
  }
  return [
    { label: "Preenchendo", estado: "concluida" },
    { label: "Enviado", estado: "concluida" },
    { label: "Em revisão", estado: "concluida" },
    { label: "Aprovado", estado: "concluida" },
  ];
}

/** Trilho de etapas tipo rastreio de encomenda ("Em produção → Postado → A
 * caminho → Entregue") — ideia do dono, set/2026, depois de achar o status
 * em badge pouco didático: "sabe quando tem etapas tipo de entrega no
 * mercado livre?". Mostra visualmente onde a semana está no caminho entre a
 * regente e a coordenadora, sem precisar entender o que "Enviado"/"Aprovado"
 * significam de cabeça — o desenho já mostra o progresso. */
export function PlanejamentoStepper({ status }: { status: "RASCUNHO" | "ENVIADO" | "APROVADO" | "DEVOLVIDO" }) {
  const etapas = calcularEtapas(status);

  return (
    <div className="flex items-start">
      {etapas.map((etapa, i) => {
        const cor = COR[etapa.estado];
        const alcancado = etapa.estado === "concluida" || etapa.estado === "atual" || etapa.estado === "erro";
        return (
          <div key={etapa.label} className="flex flex-1 items-start last:flex-none">
            {i > 0 && (
              <div
                className="mt-3.5 h-0.5 flex-1 shrink"
                style={{ backgroundColor: alcancado ? COR[etapas[i - 1].estado].borda : "var(--cda-border)" }}
              />
            )}
            <div className="flex w-16 flex-col items-center gap-1 text-center sm:w-20">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2"
                style={{ backgroundColor: cor.bg, borderColor: cor.borda }}
              >
                {etapa.estado === "concluida" && <Check className="h-3.5 w-3.5 text-white" />}
                {etapa.estado === "erro" && <X className="h-3.5 w-3.5 text-white" />}
                {etapa.estado === "atual" && <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cor.borda }} />}
              </div>
              <span className="text-[10.5px] font-medium leading-tight" style={{ color: cor.texto }}>
                {etapa.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
