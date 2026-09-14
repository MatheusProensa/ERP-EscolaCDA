"use client";

import { useRef, useState, type DragEvent } from "react";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const TAMANHO_MAXIMO = 8 * 1024 * 1024; // 8MB — foto de celular sem compressão
const LADO_MAXIMO = 1600; // portfólio é pra ver grande (e um dia virar PDF de fim de ano) — bem maior que o avatar (480px)

/** Mesma ideia do PhotoUpload (redimensiona no navegador antes de virar
 * base64), só que com lado máximo bem maior — essa foto não é um avatar
 * pequeno, é pra aparecer grande na linha do tempo e um dia sair impressa. */
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
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem"));
    };
    img.src = url;
  });
}

/** Área de arrastar-e-soltar pra anexar foto no portfólio — pedido explícito
 * do dono (out/2026): "bem intuitivo, tipo arrastar-e-soltar ou tirar foto
 * direto pelo tablet". No tablet/celular, tocar aqui já abre o seletor
 * nativo que mistura câmera e galeria — não precisa de botão separado. */
export function FotoPortfolioUpload({ value, onChange }: { value: string | null; onChange: (value: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const [erro, setErro] = useState("");
  const [processando, setProcessando] = useState(false);

  async function handleFile(file: File | undefined) {
    setErro("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErro("Selecione um arquivo de imagem.");
      return;
    }
    if (file.size > TAMANHO_MAXIMO) {
      setErro("A imagem deve ter até 8MB.");
      return;
    }
    setProcessando(true);
    try {
      onChange(await redimensionar(file));
    } catch {
      setErro("Não foi possível processar essa imagem. Tente outro arquivo.");
    }
    setProcessando(false);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setArrastando(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  if (value) {
    return (
      <div className="relative overflow-hidden rounded-lg border border-cda-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="Foto do portfólio" className="max-h-80 w-full object-contain bg-cda-bg" />
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Remover foto"
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setArrastando(true);
      }}
      onDragLeave={() => setArrastando(false)}
      onDrop={onDrop}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-10 text-center transition-colors",
        arrastando ? "border-cda-blue bg-cda-blue/5" : "border-cda-border bg-cda-bg hover:bg-cda-border/20"
      )}
    >
      <ImagePlus className="h-8 w-8 text-cda-text3" />
      <p className="text-sm font-medium text-cda-text2">{processando ? "Processando..." : "Toque ou arraste uma foto aqui"}</p>
      <p className="text-xs text-cda-text3">JPG ou PNG, até 8MB</p>
      {erro && <p className="text-xs text-cda-red">{erro}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
    </div>
  );
}
