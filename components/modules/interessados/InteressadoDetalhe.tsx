"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, MessageCircle, Mail, Cake, CalendarCheck, CalendarClock, GraduationCap, Quote, StickyNote } from "lucide-react";
import type { Turma } from "@prisma/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, BADGE_VARIANT_STYLE, type BadgeVariant } from "@/components/ui/Badge";
import { showToast } from "@/components/ui/Toast";
import { formatarData, formatarTelefone, linkWhatsApp } from "@/lib/utils";
import { STATUS_INTERESSADO_BADGE } from "@/lib/statusVisual";
import { EditarInteressadoModal } from "./EditarInteressadoModal";
import type { ItemInteressado } from "./types";

const CAT_CICLO: BadgeVariant[] = ["cat1", "cat2", "cat3", "cat4", "cat5", "cat6"];
function corPorTexto(texto: string): BadgeVariant {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) >>> 0;
  return CAT_CICLO[h % CAT_CICLO.length];
}

/** Tela de perfil de um interessado — pra abrir clicando no nome da criança na
 * tabela. O modal de "Editar" continua existindo (formulário rápido), mas aqui
 * dá pra ver tudo com espaço de sobra, com "o que busca" e "observações"
 * claramente separados um do outro (era a maior confusão do modal apertado). */
export function InteressadoDetalhe({
  item,
  turmas,
  podeEditar = true,
}: {
  item: ItemInteressado;
  turmas: Turma[];
  podeEditar?: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const badge = STATUS_INTERESSADO_BADGE[item.status] ?? { variant: "neutral" as const, label: item.status };
  const interesse = item.turmaDesejada?.nome ?? item.interesseTexto;

  async function alterarStatus(status: string) {
    setCarregando(true);
    try {
      const res = await fetch(`/api/interessados/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      showToast("Não foi possível atualizar o status. Tente de novo.", "error");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={item.nomeCrianca}
        subtitle={`Responsável: ${item.nomeResponsavel}${item.parentescoContato ? ` (contato: ${item.parentescoContato})` : ""}`}
        breadcrumb={[{ label: "Administrativo" }, { label: "Interessados", href: "/interessados" }, { label: item.nomeCrianca }]}
        action={
          podeEditar ? (
            <Button variant="outline" onClick={() => setEditando(true)}>
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar nome={item.nomeCrianca} foto={item.foto} size="xl" />
                <div>
                  <h2 className="text-lg font-bold text-cda-text">{item.nomeCrianca}</h2>
                  {item.dataNascimento && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-cda-text2">
                      <Cake className="h-3.5 w-3.5" />
                      {formatarData(item.dataNascimento)}
                    </p>
                  )}
                  {interesse && (
                    <div className="mt-2">
                      <Badge variant={corPorTexto(interesse)}>{interesse}</Badge>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className="text-xs font-medium text-cda-text3">Status</span>
                {podeEditar ? (
                  <FilterSelect
                    className="w-[210px]"
                    value={item.status}
                    disabled={carregando}
                    onChange={alterarStatus}
                    placeholder="Status"
                    triggerStyle={{
                      ...BADGE_VARIANT_STYLE[badge.variant],
                      border: "none",
                      height: "36px",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                    }}
                    options={Object.entries(STATUS_INTERESSADO_BADGE).map(([valor, { label }]) => ({ value: valor, label }))}
                  />
                ) : (
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-cda-border pt-4 text-sm">
              <a
                href={linkWhatsApp(item.telefoneResponsavel)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-cda-text2 hover:text-cda-green"
              >
                <MessageCircle className="h-4 w-4" />
                {formatarTelefone(item.telefoneResponsavel)}
              </a>
              {item.emailResponsavel && (
                <a href={`mailto:${item.emailResponsavel}`} className="flex items-center gap-1.5 text-cda-text2 hover:text-cda-blue">
                  <Mail className="h-4 w-4" />
                  {item.emailResponsavel}
                </a>
              )}
            </div>
          </Card>

          {/* "O que busca" — a prioridade da família, é o conteúdo principal
              dessa tela, por isso vem em destaque, bem separado das observações. */}
          <Card>
            <div className="flex items-center gap-2 border-b border-cda-border px-5 py-4">
              <Quote className="h-4 w-4 text-cda-blue" />
              <h3 className="text-sm font-semibold text-cda-text">O que a família busca</h3>
            </div>
            <div className="p-5">
              {item.oQueBusca ? (
                <p className="text-sm leading-relaxed text-cda-text whitespace-pre-wrap">{item.oQueBusca}</p>
              ) : (
                <p className="text-sm text-cda-text3">Nada anotado ainda.</p>
              )}
            </div>
          </Card>

          {/* Observações internas — de propósito com outra cor de fundo, pra nunca
              mais parecer a mesma coisa que "o que busca" (era a confusão do modal). */}
          <Card className="bg-cda-bg">
            <div className="flex items-center gap-2 border-b border-cda-border px-5 py-4">
              <StickyNote className="h-4 w-4 text-cda-text3" />
              <h3 className="text-sm font-semibold text-cda-text">Observações internas</h3>
            </div>
            <div className="p-5">
              {item.observacoes ? (
                <p className="text-sm leading-relaxed text-cda-text2 whitespace-pre-wrap">{item.observacoes}</p>
              ) : (
                <p className="text-sm text-cda-text3">Nenhuma anotação da secretaria ainda.</p>
              )}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card title="Informações">
            <div className="flex flex-col divide-y divide-cda-border px-5">
              <InfoItem icon={GraduationCap} label="Turma cadastrada" value={item.turmaDesejada?.nome ?? "—"} />
              <InfoItem icon={GraduationCap} label="Turma/turno de interesse" value={item.interesseTexto ?? "—"} />
              <InfoItem
                icon={CalendarClock}
                label="1º contato"
                value={item.dataPrimeiroContato ? formatarData(item.dataPrimeiroContato) : "—"}
              />
              <InfoItem icon={CalendarCheck} label="Visita" value={item.dataVisita ? formatarData(item.dataVisita) : "—"} />
              <InfoItem icon={Cake} label="Cadastrado em" value={formatarData(item.createdAt)} />
            </div>
          </Card>
        </div>
      </div>

      <EditarInteressadoModal item={editando ? item : null} turmas={turmas} onClose={() => setEditando(false)} />
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 py-3 text-sm">
      <Icon className="h-4 w-4 shrink-0 text-cda-text3" />
      <div className="min-w-0">
        <div className="text-xs text-cda-text3">{label}</div>
        <div className="truncate text-cda-text">{value}</div>
      </div>
    </div>
  );
}
