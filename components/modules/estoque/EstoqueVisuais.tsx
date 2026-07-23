import * as Icons from "lucide-react";
import { statusEstoque, STATUS_ESTOQUE_INFO, categoriaVisual, type StatusEstoque } from "@/lib/estoqueStatus";

export function StatusEstoquePill({ status }: { status: StatusEstoque }) {
  const info = STATUS_ESTOQUE_INFO[status];
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: info.tint, color: info.cor }}
    >
      <Icons.TriangleAlert className="h-3 w-3" style={{ display: status === "ok" ? "none" : undefined }} />
      {info.label}
    </span>
  );
}

export function CategoriaCell({ categoria }: { categoria: string }) {
  const { icone, cor } = categoriaVisual(categoria);
  const Icone = (Icons as unknown as Record<string, Icons.LucideIcon>)[icone] ?? Icons.Package;
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="flex h-5 w-5 items-center justify-center rounded"
        style={{ backgroundColor: `${cor}22`, color: cor }}
      >
        <Icone className="h-3 w-3" />
      </span>
      <span className="text-xs font-medium text-cda-text2">{categoria}</span>
    </span>
  );
}

export function StockBar({ quantidade, minimo }: { quantidade: number; minimo: number }) {
  const status = statusEstoque(quantidade, minimo);
  const cor = STATUS_ESTOQUE_INFO[status].cor;
  const proporcao = Math.min(quantidade / (minimo * 2 || 1), 1);
  return (
    <div className="flex items-center gap-2">
      <span className="min-w-[32px] text-right font-mono text-sm font-semibold text-cda-text">{quantidade}</span>
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-cda-bg">
        <div className="h-full rounded-full" style={{ width: `${proporcao * 100}%`, backgroundColor: cor }} />
      </div>
    </div>
  );
}
