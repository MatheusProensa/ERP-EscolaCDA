"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Download } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatarData } from "@/lib/utils";

export function AssinarContratoForm({
  token,
  jaAssinado,
  nomeAssinante,
  assinadoEm,
  arquivo,
}: {
  token: string;
  jaAssinado: boolean;
  nomeAssinante: string | null;
  assinadoEm: string | null;
  arquivo: string | null;
}) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [concordo, setConcordo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function assinar() {
    setError("");
    setLoading(true);
    const res = await fetch(`/api/assinar/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, cpf, concordo }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível assinar. Tente de novo.");
      return;
    }
    router.refresh();
  }

  if (jaAssinado) {
    return (
      <Card className="flex flex-col items-center gap-3 p-6 text-center">
        <CheckCircle2 className="h-10 w-10 text-cda-green" />
        <p className="font-semibold text-cda-text">Contrato assinado</p>
        <p className="text-sm text-cda-text2">
          Assinado por {nomeAssinante}
          {assinadoEm ? ` em ${formatarData(new Date(assinadoEm))}` : ""}.
        </p>
        {arquivo && (
          <a
            href={arquivo}
            download="contrato-assinado.pdf"
            className="flex h-10 items-center gap-2 rounded-lg border border-cda-border bg-white px-4 text-sm font-medium text-cda-text hover:bg-cda-bg"
          >
            <Download className="h-4 w-4" />
            Baixar PDF assinado
          </a>
        )}
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <p className="text-sm font-semibold text-cda-text">Assinar este contrato</p>
      <Input label="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome completo" />
      <Input label="CPF (opcional)" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" />
      <label className="flex items-start gap-2 text-sm text-cda-text2">
        <input
          type="checkbox"
          checked={concordo}
          onChange={(e) => setConcordo(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-cda-border"
        />
        Li e concordo com os termos do contrato acima. Estou ciente de que esta assinatura eletrônica tem validade
        jurídica (MP 2.200-2/2001).
      </label>
      {error && <p className="text-sm text-cda-red">{error}</p>}
      <Button onClick={assinar} loading={loading} disabled={!nome.trim() || !concordo}>
        Assinar contrato
      </Button>
    </Card>
  );
}
