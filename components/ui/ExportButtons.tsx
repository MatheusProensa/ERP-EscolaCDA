import { Download, FileText } from "lucide-react";

export function ExportButtons({ href, label = "Exportar" }: { href: string; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="hidden text-xs font-medium text-cda-text3 sm:inline">{label}</span>}
      <a
        href={href}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-cda-border bg-white px-3 text-xs font-medium text-cda-text hover:bg-cda-bg"
      >
        <Download className="h-3.5 w-3.5" />
        CSV
      </a>
      <a
        href={`${href}?formato=pdf`}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-cda-border bg-white px-3 text-xs font-medium text-cda-text hover:bg-cda-bg"
      >
        <FileText className="h-3.5 w-3.5" />
        PDF
      </a>
    </div>
  );
}
