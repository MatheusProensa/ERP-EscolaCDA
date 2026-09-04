import { UtensilsCrossed } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { CardapioPublicoCard } from "@/components/modules/cardapio/CardapioPublicoCard";
import { PrepararMesButton } from "@/components/modules/cardapio/PrepararMesButton";
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

  const anoAtual = hoje.getUTCFullYear();
  const anos = [anoAtual - 1, anoAtual, anoAtual + 1];

  return (
    <div>
      <PageHeader
        title="Cardápio"
        subtitle="Alimentação por público — o que a Nutricionista define pra cada mês, sempre em vigor"
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
        </form>
      </Card>

      {blocos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-cda-border bg-white py-16 text-center">
          <UtensilsCrossed className="h-8 w-8 text-cda-text3" />
          <p className="text-sm text-cda-text3">
            Ainda não tem cardápio cadastrado pra {MESES_CARDAPIO[mes - 1]} de {ano}.
          </p>
          <PrepararMesButton ano={ano} mes={mes} />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {PUBLICOS_CARDAPIO.map((p) => {
            const item = porPublico.get(p.valor);
            if (!item) return null;
            return <CardapioPublicoCard key={p.valor} item={item} label={p.label} notaPublico={p.nota} />;
          })}
        </div>
      )}
    </div>
  );
}
