import { Download, FileDown, FileText } from "lucide-react";
import { MenuButton } from "./MenuButton";

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
    <MenuButton
      label={label}
      icon={FileDown}
      size="sm"
      items={[
        { label: "Baixar CSV", icon: Download, href: montarUrl(href, params) },
        { label: "Baixar PDF", icon: FileText, href: montarUrl(href, params, "pdf") },
      ]}
    />
  );
}
