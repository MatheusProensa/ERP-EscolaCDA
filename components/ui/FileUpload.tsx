"use client";

import { useRef, useState } from "react";
import { Paperclip } from "lucide-react";
import { Button } from "./Button";

export function FileUpload({
  onSelect,
  disabled,
  maxSizeMB = 5,
  accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx",
  label = "Anexar arquivo",
}: {
  onSelect: (arquivo: string, nomeArquivo: string) => void;
  disabled?: boolean;
  maxSizeMB?: number;
  accept?: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState("");

  function handleFile(file: File | undefined) {
    setErro("");
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      setErro(`O arquivo deve ter até ${maxSizeMB}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onSelect(reader.result as string, file.name);
    reader.readAsDataURL(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      {label ? (
        <Button type="button" variant="outline" size="sm" icon={Paperclip} disabled={disabled} onClick={() => inputRef.current?.click()}>
          {label}
        </Button>
      ) : (
        // Sem rótulo (ex.: barra de anexo do Chat) — botão circular igual ao de
        // emoji ao lado, não o pill com borda/padding de texto (era mais largo
        // que precisava, empurrava o resto da barra pra fora da tela no celular).
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          aria-label="Anexar arquivo"
          title="Anexar arquivo"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-cda-text3 hover:bg-white hover:text-cda-text2 disabled:opacity-50"
        >
          <Paperclip className="h-4 w-4" />
        </button>
      )}
      {erro && <p className="mt-1 text-xs text-cda-red">{erro}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
