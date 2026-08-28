"use client";

import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "./Button";
import { corAvatar, iniciais } from "@/lib/utils";

const TAMANHO_MAXIMO = 3 * 1024 * 1024; // 3MB — limite do arquivo ORIGINAL selecionado
const LADO_MAXIMO = 480; // a foto só aparece como avatar (no máx. 96px, ~192px em telas retina)

/** Redimensiona a imagem no navegador antes de virar base64 — uma foto de
 * celular sem compressão vinha com vários MB, e como fica salva direto numa
 * coluna do banco e é buscada em telas de listagem inteiras (não só no perfil),
 * isso pesava a navegação do site inteiro. Aqui ela vira um JPEG pequeno
 * (poucos KB) antes de sair do navegador. */
function redimensionar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const escala = Math.min(1, LADO_MAXIMO / Math.max(img.width, img.height));
      const largura = Math.round(img.width * escala);
      const altura = Math.round(img.height * escala);
      const canvas = document.createElement("canvas");
      canvas.width = largura;
      canvas.height = altura;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas indisponível"));
        return;
      }
      ctx.drawImage(img, 0, 0, largura, altura);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem"));
    };
    img.src = url;
  });
}

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

  async function handleFile(file: File | undefined) {
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

    try {
      onChange(await redimensionar(file));
    } catch {
      setErro("Não foi possível processar essa imagem. Tente outro arquivo.");
    }
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
          <Button type="button" variant="outline" size="sm" icon={Camera} onClick={() => inputRef.current?.click()}>
            {value ? "Trocar foto" : "Adicionar foto"}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" icon={X} className="text-status-danger" onClick={() => onChange(null)}>
              Remover
            </Button>
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
