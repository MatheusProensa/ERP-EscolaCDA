"use client";

import { useRef, useState } from "react";
import { Paperclip } from "lucide-react";

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
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 rounded-lg border border-cda-border bg-white px-3 py-1.5 text-xs font-medium text-cda-text hover:bg-cda-bg disabled:opacity-50"
      >
        <Paperclip className="h-3.5 w-3.5" />
        {label}
      </button>
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
