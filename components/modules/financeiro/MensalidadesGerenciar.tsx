"use client";

import { useState } from "react";
import { MensalidadeTable, type MensalidadeLinha } from "./MensalidadeTable";
import { RegistrarPagamentoModal } from "./RegistrarPagamentoModal";

export function MensalidadesGerenciar({ mensalidades }: { mensalidades: MensalidadeLinha[] }) {
  const [selecionada, setSelecionada] = useState<MensalidadeLinha | null>(null);

  return (
    <>
      <MensalidadeTable mensalidades={mensalidades} onRegistrarPagamento={setSelecionada} podeEditar />
      <RegistrarPagamentoModal mensalidade={selecionada} onClose={() => setSelecionada(null)} />
    </>
  );
}
