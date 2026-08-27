"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("E-mail ou senha inválidos.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
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
      <Input
        label="Senha"
        name="password"
        type={mostrarSenha ? "text" : "password"}
        placeholder="••••••••"
        icon={<Lock className="h-4 w-4" />}
        rightElement={
          <button
            type="button"
            onClick={() => setMostrarSenha((v) => !v)}
            className="pointer-events-auto text-cda-text3 hover:text-cda-text2"
            tabIndex={-1}
            aria-label={mostrarSenha ? "Esconder senha" : "Mostrar senha"}
          >
            {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
        required
      />
      {error && <p className="text-sm text-cda-red">{error}</p>}
      <Button type="submit" loading={loading} className="mt-2 w-full">
        Entrar
      </Button>
      <a href="/esqueci-senha" className="text-center text-sm text-cda-blue hover:underline">
        Esqueci minha senha
      </a>
    </form>
  );
}
