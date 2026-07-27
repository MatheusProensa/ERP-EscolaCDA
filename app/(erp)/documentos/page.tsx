import { TriangleAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { NovoDocumentoModal } from "@/components/modules/documentos/NovoDocumentoModal";
import { DocumentosLista } from "@/components/modules/documentos/DocumentosLista";
import { CATEGORIAS_DOCUMENTO, formatarData } from "@/lib/utils";

export default async function DocumentosPage() {
  const documentos = await prisma.documentoInstitucional.findMany({
    orderBy: [{ categoria: "asc" }, { titulo: "asc" }],
  });

  const grupos = CATEGORIAS_DOCUMENTO.map((categoria) => ({
    categoria,
    itens: documentos.filter((d) => d.categoria === categoria),
  })).filter((g) => g.itens.length > 0);

  const outras = documentos.filter((d) => !CATEGORIAS_DOCUMENTO.includes(d.categoria));
  if (outras.length > 0) grupos.push({ categoria: "Outros", itens: outras });

  const hoje = new Date();
  const vencidos = documentos.filter((d) => d.validade && new Date(d.validade) < hoje);

  return (
    <div>
      <PageHeader
        title="Documentos Institucionais"
        subtitle="Alvará, contratos, credenciamento e demais documentos da escola — acesso restrito à Direção"
        action={<NovoDocumentoModal />}
      />

      {vencidos.length > 0 && (
        <Card className="mb-5 flex items-center gap-4 border-cda-red bg-cda-red/5 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cda-red/15">
            <TriangleAlert className="h-5 w-5 text-cda-red" />
          </div>
          <div>
            <p className="text-sm font-semibold text-cda-text">
              {vencidos.length === 1 ? "1 documento vencido" : `${vencidos.length} documentos vencidos`}
            </p>
            <p className="text-xs text-cda-text2">
              {vencidos.map((d) => `${d.titulo} (venceu em ${formatarData(d.validade!)})`).join(" · ")}
            </p>
          </div>
        </Card>
      )}

      {grupos.length === 0 ? (
        <Card className="p-8 text-center text-sm text-cda-text3">Nenhum documento cadastrado ainda.</Card>
      ) : (
        <DocumentosLista grupos={grupos} />
      )}
    </div>
  );
}
