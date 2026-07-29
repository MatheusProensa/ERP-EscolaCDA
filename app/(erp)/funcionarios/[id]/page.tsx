import { notFound } from "next/navigation";
import { Phone, Mail, Calendar, Cake, Briefcase, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { DocumentosFuncionario } from "@/components/modules/funcionarios/DocumentosFuncionario";
import { formatarCPF, formatarData, formatarTelefone } from "@/lib/utils";

export default async function FuncionarioPerfilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const funcionario = await prisma.funcionario.findUnique({
    where: { id },
    include: { documentos: { orderBy: { createdAt: "desc" } } },
  });

  if (!funcionario) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <PageHeader
        title={funcionario.nome}
        breadcrumb={[{ label: "Funcionários", href: "/funcionarios" }, { label: funcionario.nome }]}
      />

      <Card className="p-5">
        <div className="flex items-start gap-4">
          <Avatar nome={funcionario.nome} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-cda-text">{funcionario.nome}</h2>
                <Badge variant={funcionario.ativo ? "green" : "gray"}>
                  {funcionario.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <Button href={`/funcionarios/${funcionario.id}/editar`} variant="outline" size="sm">
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
            </div>
            <p className="mt-0.5 text-sm text-cda-text2">
              {funcionario.cargo} · {funcionario.setor}
            </p>

            <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <InfoItem icon={Briefcase} label="CPF" value={formatarCPF(funcionario.cpf)} />
              <InfoItem icon={Calendar} label="Admissão" value={formatarData(funcionario.admissao)} />
              <InfoItem
                icon={Cake}
                label="Nascimento"
                value={funcionario.dataNascimento ? formatarData(funcionario.dataNascimento) : "Não informado"}
              />
              <InfoItem
                icon={Phone}
                label="Telefone"
                value={funcionario.telefone ? formatarTelefone(funcionario.telefone) : "Não informado"}
              />
              <InfoItem icon={Mail} label="E-mail" value={funcionario.email ?? "Não informado"} />
            </div>
          </div>
        </div>
      </Card>

      <DocumentosFuncionario funcionarioId={funcionario.id} documentos={funcionario.documentos} />
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-cda-text3" />
      <span className="text-cda-text3">{label}: </span>
      <span className="text-cda-text">{value}</span>
    </div>
  );
}
