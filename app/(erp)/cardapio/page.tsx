import { UtensilsCrossed } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { CardapioPublicoCard } from "@/components/modules/cardapio/CardapioPublicoCard";
import { PrepararMesButton } from "@/components/modules/cardapio/PrepararMesButton";
import { ExcluirMesButton } from "@/components/modules/cardapio/ExcluirMesButton";
import { CardapioExportButtons } from "@/components/modules/cardapio/CardapioExportButtons";
import { PUBLICOS_CARDAPIO, MESES_CARDAPIO } from "@/components/modules/cardapio/constants";
import type { ItemCardapioMes } from "@/components/modules/cardapio/types";

export default async function CardapioPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string }>;
}) {
  const { ano: anoParam, mes: mesParam } = await searchParams;
  const hoje = new Date();
  const ano = Number(anoParam) || hoje.getUTCFullYear();
  const mes = Number(mesParam) || hoje.getUTCMonth() + 1;

  const blocosRaw = await prisma.cardapioMes.findMany({ where: { ano, mes } });
  const blocos = blocosRaw as unknown as ItemCardapioMes[];
  const porPublico = new Map(blocos.map((b) => [b.publico, b]));

  // Pro botão "Copiar do mês anterior" — o mês/ano com cardápio cadastrado
  // mais recente ANTES do que está sendo visto agora (não precisa ser o mês
  // civil imediatamente anterior: se pularam um mês, pega o último que tem
  // dado de verdade).
  const mesAnteriorComDados =
    blocos.length === 0
      ? await prisma.cardapioMes.findFirst({
          where: { OR: [{ ano: { lt: ano } }, { ano, mes: { lt: mes } }] },
          orderBy: [{ ano: "desc" }, { mes: "desc" }],
          select: { ano: true, mes: true },
        })
      : null;

  const anoAtual = hoje.getUTCFullYear();
  const anos = [anoAtual - 1, anoAtual, anoAtual + 1];

  return (
    <div>
      <PageHeader
        title="Cardápio"
        subtitle="Alimentação por público — o que a Nutricionista define pra cada mês, sempre em vigor"
        action={blocos.length > 0 ? <CardapioExportButtons ano={ano} mes={mes} /> : undefined}
      />

      <Card className="mb-5 p-4">
        <form className="flex flex-wrap items-center gap-3">
          <Select name="mes" defaultValue={String(mes)} className="w-full sm:w-44">
            {MESES_CARDAPIO.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </Select>
          <Select name="ano" defaultValue={String(ano)} className="w-full sm:w-28">
            {anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="outline">
            Filtrar
          </Button>
          {blocos.length > 0 && (
            <ExcluirMesButton ano={ano} mes={mes} mesLabel={`${MESES_CARDAPIO[mes - 1]} de ${ano}`} />
          )}
        </form>
      </Card>

      {blocos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-cda-border bg-white py-16 text-center">
          <UtensilsCrossed className="h-8 w-8 text-cda-text3" />
          <p className="text-sm text-cda-text3">
            Ainda não tem cardápio cadastrado pra {MESES_CARDAPIO[mes - 1]} de {ano}.
          </p>
          <PrepararMesButton
            ano={ano}
            mes={mes}
            mesAnterior={
              mesAnteriorComDados
                ? { ano: mesAnteriorComDados.ano, mes: mesAnteriorComDados.mes, label: MESES_CARDAPIO[mesAnteriorComDados.mes - 1] }
                : null
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {PUBLICOS_CARDAPIO.map((p) => {
            const item = porPublico.get(p.valor);
            if (!item) return null;
            return <CardapioPublicoCard key={p.valor} item={item} label={p.label} notaPublico={p.nota} cor={p.cor} />;
          })}
        </div>
      )}
    </div>
  );
}
