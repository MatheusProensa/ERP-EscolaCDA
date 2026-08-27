import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { NovaNotaFiscalModal } from "@/components/modules/notasfiscais/NovaNotaFiscalModal";
import { NotasFiscaisTable } from "@/components/modules/notasfiscais/NotasFiscaisTable";
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
        action={<NovaNotaFiscalModal alunos={alunos} />}
      />

      {!configurado && (
        <div className="mb-5 flex flex-col items-start gap-2 rounded-[10px] border border-cda-amber/30 bg-cda-amber/5 p-4 sm:flex-row">
          <Badge variant="amber" className="shrink-0">
            Emissão ainda não ligada
          </Badge>
          <p className="text-sm text-cda-text2">
            Falta o certificado digital da escola e a autorização de webservice da Prefeitura de Santa Maria. Dá pra
            lançar as notas normalmente — elas ficam registradas e você tenta emitir de novo assim que isso estiver
            pronto.
          </p>
        </div>
      )}

      <Card>
        <NotasFiscaisTable notas={notas} />
      </Card>
    </div>
  );
}
