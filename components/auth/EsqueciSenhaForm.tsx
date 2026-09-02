"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Mail } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";

export function EsqueciSenhaForm() {
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      // A resposta é sempre a mesma exista ou não a conta (evita expor quais
      // e-mails têm cadastro) — só um erro de rede/servidor de verdade deve
      // impedir a tela de "pedido registrado".
      const res = await fetch("/api/auth/esqueci-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fd.get("email") }),
      });
      if (!res.ok) throw new Error();
      setEnviado(true);
    } catch {
      showToast("Não foi possível registrar o pedido agora. Tente de novo.", "error");
    } finally {
      setLoading(false);
    }
  }

  if (enviado) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle2 className="h-10 w-10 text-cda-green" />
        <p className="text-sm text-cda-text2">
          Pedido registrado. Se esse e-mail tiver conta no sistema, um administrador vai ver o pedido e te passar uma
          senha nova.
        </p>
        <a href="/login" className="text-sm font-medium text-cda-blue hover:underline">
          Voltar pro login
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="E-mail"
        name="email"
        type="email"
        placeholder="seu@escolacda.com.br"
        icon={<Mail className="h-4 w-4" />}
        required
      />
      <Button type="submit" loading={loading} className="w-full">
        Avisar administrador
      </Button>
      <a href="/login" className="text-center text-sm text-cda-text3 hover:underline">
        Voltar pro login
      </a>
    </form>
  );
}
