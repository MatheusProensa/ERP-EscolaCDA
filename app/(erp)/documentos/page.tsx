import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { DocumentosPainel } from "@/components/modules/documentos/DocumentosPainel";
import { NovoDocumentoModal } from "@/components/modules/documentos/NovoDocumentoModal";

export default async function DocumentosPage() {
  const documentos = await prisma.documento.findMany({ orderBy: [{ categoria: "asc" }, { titulo: "asc" }] });

  return (
    <div>
      <PageHeader
        title="Documentos"
        subtitle="Legalização, contratos, financeiro e RH da escola em um só lugar"
        action={<NovoDocumentoModal />}
      />
      <DocumentosPainel documentos={documentos} />
    </div>
  );
}
