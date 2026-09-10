"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { MESES } from "@/lib/calendario";

type Modo = "ano" | "mes";
type Modelo = "simples" | "equipe";

const ANOS_DISPONIVEIS = (() => {
  const atual = new Date().getFullYear();
  return [atual - 1, atual, atual + 1, atual + 2];
})();

export function ExportarCalendarioPdfModal() {
  const hoje = new Date();
  const [open, setOpen] = useState(false);
  const [modelo, setModelo] = useState<Modelo>("simples");
  const [modo, setModo] = useState<Modo>("ano");
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());

  function exportar() {
    // "Simples" só existe pro ano inteiro (folha única, mural/família) —
    // ignora o modo mês mesmo que tenha ficado selecionado antes de trocar
    // de modelo.
    const url =
      modelo === "simples"
        ? `/api/calendario/pdf?modelo=simples&modo=ano&ano=${ano}`
        : modo === "ano"
          ? `/api/calendario/pdf?modelo=equipe&modo=ano&ano=${ano}`
          : `/api/calendario/pdf?modelo=equipe&modo=mes&ano=${ano}&mes=${mes}`;
    window.open(url, "_blank");
    setOpen(false);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" size="sm">
        <FileDown className="h-3.5 w-3.5" />
        Exportar PDF
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Exportar calendário em PDF">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Segmented
              options={[
                { value: "simples", label: "Simples (mural/família)" },
                { value: "equipe", label: "Equipe (completo)" },
              ]}
              value={modelo}
              onChange={setModelo}
            />
            <p className="text-xs text-cda-text3">
              {modelo === "simples"
                ? "Folha única com o ano inteiro, visual leve — só os dias marcados, sem listar os eventos."
                : "Pôster com cor por categoria e mês clicável pro detalhe — mostra todos os eventos, sem cortar nada."}
            </p>
          </div>

          {modelo === "equipe" && (
            <Segmented
              options={[
                { value: "ano", label: "Ano inteiro" },
                { value: "mes", label: "Mês específico" },
              ]}
              value={modo}
              onChange={setModo}
            />
          )}

          <div className={`grid gap-3 ${modelo === "equipe" && modo === "mes" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
            {modelo === "equipe" && modo === "mes" && (
              <Select label="Mês" value={mes} onChange={(e) => setMes(Number(e.target.value))}>
                {MESES.map((nome, i) => (
                  <option key={nome} value={i + 1}>
                    {nome}
                  </option>
                ))}
              </Select>
            )}
            <Select label="Ano" value={ano} onChange={(e) => setAno(Number(e.target.value))}>
              {ANOS_DISPONIVEIS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={exportar}>
              <FileDown className="h-4 w-4" />
              Gerar PDF
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
