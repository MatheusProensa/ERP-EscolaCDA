import { Download, FileText } from "lucide-react";

type Params = Record<string, string | undefined>;

function montarUrl(href: string, params?: Params, formato?: "pdf") {
  const query = new URLSearchParams();
  if (params) {
    for (const [chave, valor] of Object.entries(params)) {
      if (valor) query.set(chave, valor);
    }
  }
  if (formato) query.set("formato", formato);
  const qs = query.toString();
  return qs ? `${href}?${qs}` : href;
}

export function ExportButtons({ href, label = "Exportar", params }: { href: string; label?: string; params?: Params }) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="hidden text-xs font-medium text-cda-text3 sm:inline">{label}</span>}
      <a
        href={montarUrl(href, params)}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-cda-border bg-white px-3 text-xs font-medium text-cda-text hover:bg-cda-bg"
      >
        <Download className="h-3.5 w-3.5" />
        CSV
      </a>
      <a
        href={montarUrl(href, params, "pdf")}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-cda-border bg-white px-3 text-xs font-medium text-cda-text hover:bg-cda-bg"
      >
        <FileText className="h-3.5 w-3.5" />
        PDF
      </a>
    </div>
  );
}
