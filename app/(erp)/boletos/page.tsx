import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { NovoBoletoModal } from "@/components/modules/boletos/NovoBoletoModal";
import { BoletosTable } from "@/components/modules/boletos/BoletosTable";
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
        action={<NovoBoletoModal alunos={alunos} />}
      />

      {!configurado && (
        <div className="mb-5 flex flex-col items-start gap-2 rounded-[10px] border border-cda-amber/30 bg-cda-amber/5 p-4 sm:flex-row">
          <Badge variant="amber" className="shrink-0">
            Registro ainda não ligado
          </Badge>
          <p className="text-sm text-cda-text2">
            Falta o Convênio de Cobrança (Código de Beneficiário) do Banrisul e o cadastro no Portal do
            Desenvolvedor. Dá pra lançar os boletos normalmente — eles ficam registrados aqui e você tenta registrar
            de novo assim que isso estiver pronto (a cobrança continua sendo feita por fora, no Banrisul, até lá).
          </p>
        </div>
      )}

      <Card>
        <BoletosTable boletos={boletos} />
      </Card>
    </div>
  );
}
