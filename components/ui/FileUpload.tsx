"use client";

import { useRef, useState } from "react";
import { Paperclip } from "lucide-react";

const TAMANHO_MAXIMO = 5 * 1024 * 1024; // 5MB

export function FileUpload({
  onSelect,
  disabled,
}: {
  onSelect: (arquivo: string, nomeArquivo: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState("");

  function handleFile(file: File | undefined) {
    setErro("");
    if (!file) return;

    if (file.size > TAMANHO_MAXIMO) {
      setErro("O arquivo deve ter até 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onSelect(reader.result as string, file.name);
    reader.readAsDataURL(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 rounded-lg border border-cda-border bg-white px-3 py-1.5 text-xs font-medium text-cda-text hover:bg-cda-bg disabled:opacity-50"
      >
        <Paperclip className="h-3.5 w-3.5" />
        Anexar arquivo
      </button>
      {erro && <p className="mt-1 text-xs text-cda-red">{erro}</p>}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
