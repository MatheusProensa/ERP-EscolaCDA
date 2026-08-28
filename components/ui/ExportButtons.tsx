import { Download, FileText } from "lucide-react";
import { Button } from "./Button";

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
      <Button variant="outline" size="sm" icon={Download} href={montarUrl(href, params)}>
        CSV
      </Button>
      <Button variant="outline" size="sm" icon={FileText} href={montarUrl(href, params, "pdf")}>
        PDF
      </Button>
    </div>
  );
}
