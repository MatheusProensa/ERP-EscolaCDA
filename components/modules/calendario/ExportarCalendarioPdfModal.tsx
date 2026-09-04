"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { MESES } from "@/lib/calendario";

const PERIODOS = [
  { label: "1 mês", quantidade: 1 },
  { label: "Trimestre (3 meses)", quantidade: 3 },
  { label: "Semestre (6 meses)", quantidade: 6 },
  { label: "Ano (12 meses)", quantidade: 12 },
];

export function ExportarCalendarioPdfModal() {
  const hoje = new Date();
  const [open, setOpen] = useState(false);
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [quantidade, setQuantidade] = useState(1);

  function exportar() {
    const url = `/api/calendario/pdf?ano=${ano}&mes=${mes}&quantidade=${quantidade}`;
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
          <p className="text-sm text-cda-text2">
            Escolha o mês inicial e o período que quer incluir no PDF, com a identidade visual da escola.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select label="Mês inicial" value={mes} onChange={(e) => setMes(Number(e.target.value))}>
              {MESES.map((nome, i) => (
                <option key={nome} value={i + 1}>
                  {nome}
                </option>
              ))}
            </Select>
            <Select label="Ano" value={ano} onChange={(e) => setAno(Number(e.target.value))}>
              {[hoje.getFullYear() - 1, hoje.getFullYear(), hoje.getFullYear() + 1, hoje.getFullYear() + 2].map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </div>

          <Select label="Período" value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))}>
            {PERIODOS.map((p) => (
              <option key={p.quantidade} value={p.quantidade}>
                {p.label}
              </option>
            ))}
          </Select>

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
