"use client";

import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { corAvatar, iniciais } from "@/lib/utils";

const TAMANHO_MAXIMO = 3 * 1024 * 1024; // 3MB

export function PhotoUpload({
  value,
  onChange,
  nome,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  nome: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState("");

  function handleFile(file: File | undefined) {
    setErro("");
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErro("Selecione um arquivo de imagem.");
      return;
    }
    if (file.size > TAMANHO_MAXIMO) {
      setErro("A imagem deve ter até 3MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full text-lg font-semibold text-white"
        style={{ backgroundColor: value ? undefined : corAvatar(nome || "?") }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={nome} className="h-full w-full object-cover" />
        ) : (
          iniciais(nome || "?")
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-cda-border bg-white px-3 py-1.5 text-xs font-medium text-cda-text hover:bg-cda-bg"
          >
            <Camera className="h-3.5 w-3.5" />
            {value ? "Trocar foto" : "Adicionar foto"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="flex items-center gap-1.5 rounded-lg border border-cda-border bg-white px-3 py-1.5 text-xs font-medium text-cda-red hover:bg-cda-bg"
            >
              <X className="h-3.5 w-3.5" />
              Remover
            </button>
          )}
        </div>
        <span className="text-xs text-cda-text3">JPG ou PNG, até 3MB.</span>
        {erro && <span className="text-xs text-cda-red">{erro}</span>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
