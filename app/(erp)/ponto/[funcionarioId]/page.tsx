import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { comSaldos } from "@/lib/ponto";
import { PontoPainel } from "@/components/modules/ponto/PontoPainel";

export default async function PontoFuncionarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ funcionarioId: string }>;
  searchParams: Promise<{ mes?: string; ano?: string }>;
}) {
  const { funcionarioId } = await params;
  const { mes, ano } = await searchParams;

  const funcionario = await prisma.funcionario.findUnique({ where: { id: funcionarioId } });
  if (!funcionario) notFound();

  const registros = await prisma.registroPonto.findMany({ where: { funcionarioId }, orderBy: { data: "asc" } });
  const registrosComSaldo = comSaldos(registros);

  const hoje = new Date();
  const mesFiltro = mes ? Number(mes) : hoje.getMonth() + 1;
  const anoFiltro = ano ? Number(ano) : hoje.getFullYear();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={funcionario.nome}
        subtitle={`${funcionario.cargo}${funcionario.empresa ? " · " + funcionario.empresa : ""}`}
        breadcrumb={[{ label: "Ponto", href: "/ponto" }, { label: funcionario.nome }]}
      />

      <Card className="p-5">
        <div className="flex items-center gap-4">
          <Avatar nome={funcionario.nome} size="lg" />
          <div>
            <h2 className="text-lg font-bold text-cda-text">{funcionario.nome}</h2>
            <p className="text-sm text-cda-text2">
              {funcionario.cargo} · {funcionario.setor}
              {funcionario.empresa ? ` · ${funcionario.empresa}` : ""}
            </p>
          </div>
        </div>
      </Card>

      <PontoPainel
        funcionarioId={funcionario.id}
        registros={registrosComSaldo}
        mesFiltro={mesFiltro}
        anoFiltro={anoFiltro}
      />
    </div>
  );
}
