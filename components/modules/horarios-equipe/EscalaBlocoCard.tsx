"use client";

import { useState } from "react";
import { LogIn, LogOut, Clock, Pencil, StickyNote } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { EditarBlocoModal } from "./EditarBlocoModal";
import type { ItemEscalaBloco } from "./types";

const CAT_CICLO: BadgeVariant[] = ["cat1", "cat2", "cat3", "cat4", "cat5", "cat6"];
function corPorTexto(texto: string): BadgeVariant {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) >>> 0;
  return CAT_CICLO[h % CAT_CICLO.length];
}
/** Agrupa "Contraturno IV / 1º Ano EF" -> "Contraturno IV", pra blocos do
 * mesmo contraturno pegarem a mesma cor de identidade visual. */
function grupoDoTitulo(titulo: string): string {
  return titulo.split(" / ")[0].trim();
}

export function EscalaBlocoCard({ bloco }: { bloco: ItemEscalaBloco }) {
  const [editando, setEditando] = useState(false);
  const variant = corPorTexto(grupoDoTitulo(bloco.titulo));

  if (bloco.tipo === "NOTA") {
    return (
      <>
        <Card className="p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-cda-text3" />
              <h3 className="text-sm font-semibold text-cda-text">{bloco.titulo}</h3>
            </div>
            <IconButton icon={Pencil} label="Editar bloco" size="sm" onClick={() => setEditando(true)} />
          </div>
          {bloco.horariosReferencia.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {bloco.horariosReferencia.map((h, i) => (
                <Badge key={i} variant="neutral">
                  {h}
                </Badge>
              ))}
            </div>
          )}
          <p className="whitespace-pre-line text-sm leading-relaxed text-cda-text2">{bloco.conteudoLivre}</p>
        </Card>
        <EditarBlocoModal bloco={editando ? bloco : null} onClose={() => setEditando(false)} />
      </>
    );
  }

  return (
    <>
      <Card
        className="flex flex-col p-5"
        style={{ borderLeft: `3px solid var(--cat-${variant.slice(3)}-dot)` }}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-cda-text">{bloco.titulo}</h3>
          <IconButton icon={Pencil} label="Editar bloco" size="sm" onClick={() => setEditando(true)} />
        </div>

        {bloco.horariosReferencia.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-cda-text3" />
            {bloco.horariosReferencia.map((h, i) => (
              <Badge key={i} variant={variant}>
                {h}
              </Badge>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-cda-green">
              <LogIn className="h-3.5 w-3.5" />
              Entradas
            </div>
            <ul className="flex flex-col gap-1">
              {(bloco.entradas ?? []).map((e, i) => (
                <li key={i} className="text-sm text-cda-text">
                  <span className="font-medium">{e.pessoa}</span>
                  {e.nota && <span className="text-cda-text3"> — {e.nota}</span>}
                </li>
              ))}
              {(bloco.entradas ?? []).length === 0 && <li className="text-sm text-cda-text3">—</li>}
            </ul>
          </div>
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-cda-text3">
              <LogOut className="h-3.5 w-3.5" />
              Saídas
            </div>
            <ul className="flex flex-col gap-1">
              {(bloco.saidas ?? []).map((s, i) => (
                <li key={i} className="text-sm text-cda-text">
                  <span className="font-medium">{s.pessoa}</span>
                  {s.nota && <span className="text-cda-text3"> — {s.nota}</span>}
                </li>
              ))}
              {(bloco.saidas ?? []).length === 0 && <li className="text-sm text-cda-text3">—</li>}
            </ul>
          </div>
        </div>
      </Card>
      <EditarBlocoModal bloco={editando ? bloco : null} onClose={() => setEditando(false)} />
    </>
  );
}
