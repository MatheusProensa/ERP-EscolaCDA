import { TriangleAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { NovoBoletoModal } from "@/components/modules/boletos/NovoBoletoModal";
import { BoletosTable } from "@/components/modules/boletos/BoletosTable";
import { BoletosExportButton } from "@/components/modules/boletos/BoletosExportButton";
import { banrisulConfigurado } from "@/lib/banrisul";

export default async function BoletosPage() {
  const [boletos, alunos] = await Promise.all([
    prisma.boleto.findMany({
      include: { aluno: { select: { id: true, nome: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.aluno.findMany({ select: { id: true, nome: true }, orderBy: { nome: "asc" } }),
  ]);

  const configurado = banrisulConfigurado();

  return (
    <div>
      <PageHeader
        title="Boletos"
        subtitle="Cobrança de mensalidade via API do Banrisul"
        breadcrumb={[{ label: "Boletos" }]}
        action={
          <>
            {boletos.length > 0 && <BoletosExportButton />}
            <NovoBoletoModal alunos={alunos} />
          </>
        }
      />

      {!configurado && (
        <Alert tone="warning" icon={TriangleAlert} title="Registro ainda não ligado" className="mb-5">
          Falta o Convênio de Cobrança (Código de Beneficiário) do Banrisul e o cadastro no Portal do
          Desenvolvedor. Dá pra lançar os boletos normalmente — eles ficam registrados aqui e você tenta registrar
          de novo assim que isso estiver pronto (a cobrança continua sendo feita por fora, no Banrisul, até lá).
        </Alert>
      )}

      <Card>
        <BoletosTable boletos={boletos} />
      </Card>
    </div>
  );
}
