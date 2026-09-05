import { TriangleAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { NovaNotaFiscalModal } from "@/components/modules/notasfiscais/NovaNotaFiscalModal";
import { NotasFiscaisTable } from "@/components/modules/notasfiscais/NotasFiscaisTable";
import { NotasFiscaisExportButton } from "@/components/modules/notasfiscais/NotasFiscaisExportButton";
import { issnetConfigurado } from "@/lib/issnet";

export default async function NotasFiscaisPage() {
  const [notas, alunos] = await Promise.all([
    prisma.notaFiscal.findMany({
      include: { aluno: { select: { id: true, nome: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.aluno.findMany({ select: { id: true, nome: true }, orderBy: { nome: "asc" } }),
  ]);

  const configurado = issnetConfigurado();

  return (
    <div>
      <PageHeader
        title="Notas Fiscais"
        subtitle="NFS-e via ISS.net (Prefeitura de Santa Maria)"
        breadcrumb={[{ label: "Notas Fiscais" }]}
        action={
          <>
            {notas.length > 0 && <NotasFiscaisExportButton />}
            <NovaNotaFiscalModal alunos={alunos} />
          </>
        }
      />

      {!configurado && (
        <Alert tone="warning" icon={TriangleAlert} title="Emissão ainda não ligada" className="mb-5">
          Falta o certificado digital da escola e a autorização de webservice da Prefeitura de Santa Maria. Dá pra
          lançar as notas normalmente — elas ficam registradas e você tenta emitir de novo assim que isso estiver
          pronto.
        </Alert>
      )}

      <Card>
        <NotasFiscaisTable notas={notas} />
      </Card>
    </div>
  );
}
