"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, MessageCircle, Pencil } from "lucide-react";
import type { Turma } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { IconButton } from "@/components/ui/IconButton";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, BADGE_VARIANT_STYLE, type BadgeVariant } from "@/components/ui/Badge";
import { Table, TableHead, Th, TableBody, Tr, Td, TableEmpty } from "@/components/ui/Table";
import { showToast } from "@/components/ui/Toast";
import { formatarData, formatarTelefone, linkWhatsApp } from "@/lib/utils";
import { STATUS_INTERESSADO_BADGE } from "@/lib/statusVisual";
import { EditarInteressadoModal } from "./EditarInteressadoModal";
import type { ItemInteressado } from "./types";

// Cor categórica por turma de interesse — só pra dar identidade visual (não é
// estado, por isso cicla cat1-cat6 em vez de usar a paleta de status).
const CAT_CICLO: BadgeVariant[] = ["cat1", "cat2", "cat3", "cat4", "cat5", "cat6"];
function corPorTexto(texto: string): BadgeVariant {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) >>> 0;
  return CAT_CICLO[h % CAT_CICLO.length];
}

// Séries do currículo (mesma ordem do resto do sistema) — usadas pra montar
// TODAS as combinações de série × turno no filtro, não só as que por acaso já
// têm algum interessado. Turmas extras (ex.: "Contraturno I") que apareçam
// nos dados mas não estejam aqui entram avulsas, sem cruzar turno.
const SERIES_CURRICULO = [
  "Berçário I", "Berçário II", "Maternal I", "Maternal II",
  "Pré-escola I", "Pré-escola II", "1º Ano", "2º Ano", "3º Ano",
];
const TURNOS = ["manhã", "tarde", "integral", "contraturno"];

/** "Berçário I, tarde" -> { serie: "Berçário I", turno: "tarde" }. Usado tanto
 * pra montar as opções do filtro quanto pra comparar com o que cada linha tem. */
function parseInteresse(texto: string | null | undefined): { serie: string; turno: string | null } {
  if (!texto) return { serie: "", turno: null };
  const i = texto.indexOf(",");
  if (i === -1) return { serie: texto.trim(), turno: null };
  return { serie: texto.slice(0, i).trim(), turno: texto.slice(i + 1).trim().toLowerCase() };
}

export function InteressadosTable({ itens, turmas }: { itens: ItemInteressado[]; turmas: Turma[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [filtroInteresse, setFiltroInteresse] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [carregando, setCarregando] = useState<string | null>(null);
  const [editando, setEditando] = useState<ItemInteressado | null>(null);

  // Opções do filtro de turma/interesse: TODAS as combinações de série ×
  // turno do currículo (não só as que já têm algum interessado), mais
  // qualquer série "extra" que apareça nos dados e não esteja na lista
  // curricular (ex.: nome digitado diferente, ou uma turma administrativa).
  const opcoesInteresse = useMemo(() => {
    const extras = new Set<string>();
    for (const i of itens) {
      const { serie } = parseInteresse(i.turmaDesejada?.nome ?? i.interesseTexto);
      if (serie && !SERIES_CURRICULO.includes(serie)) extras.add(serie);
    }
    const series = [...SERIES_CURRICULO, ...Array.from(extras).sort((a, b) => a.localeCompare(b, "pt-BR"))];

    const opcoes: { value: string; label: string }[] = [];
    for (const serie of series) {
      for (const turno of TURNOS) {
        opcoes.push({ value: `${serie}::${turno}`, label: `${serie}, ${turno}` });
      }
    }
    return opcoes;
  }, [itens]);

  async function alterarStatus(id: string, status: string) {
    setCarregando(id);
    try {
      const res = await fetch(`/api/interessados/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      showToast("Não foi possível atualizar o status. Tente de novo.", "error");
    } finally {
      setCarregando(null);
    }
  }

  const filtrados = useMemo(() => {
    const [selSerie, selTurno] = filtroInteresse ? filtroInteresse.split("::") : [null, null];
    return itens.filter((i) => {
      if (filtroStatus && i.status !== filtroStatus) return false;
      if (selSerie) {
        const { serie, turno } = parseInteresse(i.turmaDesejada?.nome ?? i.interesseTexto);
        if (serie !== selSerie) return false;
        // Turno "tarde ou integral" (anotação de dúvida do PDF) conta pros dois
        // filtros — a família aceitaria qualquer um dos dois.
        if (selTurno && !(turno && turno.includes(selTurno))) return false;
      }
      if (busca) {
        const alvo = `${i.nomeCrianca} ${i.nomeResponsavel}`.toLowerCase();
        if (!alvo.includes(busca.toLowerCase())) return false;
      }
      return true;
    });
  }, [itens, filtroStatus, filtroInteresse, busca]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-64">
          <Input
            placeholder="Buscar criança ou responsável..."
            icon={<Search className="h-4 w-4" />}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <FilterSelect
          className="w-44"
          value={filtroInteresse}
          onChange={setFiltroInteresse}
          placeholder="Toda turma/interesse"
          options={[{ value: "", label: "Toda turma/interesse" }, ...opcoesInteresse]}
        />
        <FilterSelect
          className="w-52"
          value={filtroStatus}
          onChange={setFiltroStatus}
          placeholder="Todo status"
          options={[
            { value: "", label: "Todo status" },
            ...Object.entries(STATUS_INTERESSADO_BADGE).map(([valor, { label }]) => ({ value: valor, label })),
          ]}
        />
        {(busca || filtroInteresse || filtroStatus) && (
          <button
            type="button"
            onClick={() => {
              setBusca("");
              setFiltroInteresse("");
              setFiltroStatus("");
            }}
            className="h-10 px-2 text-xs font-medium text-cda-text3 underline-offset-2 hover:text-cda-blue hover:underline"
          >
            Limpar filtros
          </button>
        )}
        <span className="ml-auto text-xs font-medium text-cda-text3">
          {filtrados.length} de {itens.length}
        </span>
      </div>

      <Card>
        <Table>
          <TableHead>
            <Th>Criança</Th>
            <Th>Responsável</Th>
            <Th>Interesse</Th>
            <Th>O que busca</Th>
            <Th>1º contato</Th>
            <Th>Visita</Th>
            <Th>Status</Th>
            <Th>{""}</Th>
          </TableHead>
          <TableBody>
            {filtrados.length === 0 && <TableEmpty colSpan={8}>Nenhum interessado encontrado.</TableEmpty>}
            {filtrados.map((item) => {
              const badge = STATUS_INTERESSADO_BADGE[item.status] ?? { variant: "neutral" as const, label: item.status };
              const corStatus = (BADGE_VARIANT_STYLE[badge.variant].color as string) ?? "var(--text-body)";
              const nota = item.oQueBusca || item.observacoes;
              const interesse = item.turmaDesejada?.nome ?? item.interesseTexto;
              return (
                <Tr
                  key={item.id}
                  className="hover:brightness-[0.97] transition-[filter]"
                  style={{
                    borderLeft: `3px solid color-mix(in oklch, ${corStatus} 65%, transparent)`,
                    backgroundColor: `color-mix(in oklch, ${corStatus} 5%, white)`,
                  }}
                >
                  <Td className="font-medium">
                    <Link href={`/interessados/${item.id}`} className="flex items-center gap-2.5 group">
                      <Avatar nome={item.nomeCrianca} foto={item.foto} size="sm" />
                      <div>
                        <span className="group-hover:text-cda-blue group-hover:underline underline-offset-2">
                          {item.nomeCrianca}
                        </span>
                        {item.dataNascimento && (
                          <div className="text-xs font-normal text-cda-text3">{formatarData(item.dataNascimento)}</div>
                        )}
                      </div>
                    </Link>
                  </Td>
                  <Td>
                    {item.nomeResponsavel}
                    {item.parentescoContato && <span className="ml-1 text-xs text-cda-text3">({item.parentescoContato})</span>}
                    <a
                      href={linkWhatsApp(item.telefoneResponsavel)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Chamar no WhatsApp"
                      className="mt-0.5 flex items-center gap-1 text-xs text-cda-text3 hover:text-cda-green"
                    >
                      <MessageCircle className="h-3 w-3" />
                      {formatarTelefone(item.telefoneResponsavel)}
                    </a>
                  </Td>
                  <Td>
                    {interesse ? (
                      <Badge variant={corPorTexto(interesse)}>{interesse}</Badge>
                    ) : (
                      <span className="text-cda-text3">—</span>
                    )}
                  </Td>
                  <Td className="max-w-[240px]">
                    {nota ? (
                      <span className="line-clamp-2 text-xs text-cda-text2" title={nota}>
                        {nota}
                      </span>
                    ) : (
                      <span className="text-cda-text3">—</span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-cda-text2">
                    {item.dataPrimeiroContato ? formatarData(item.dataPrimeiroContato) : "—"}
                  </Td>
                  <Td className="whitespace-nowrap text-cda-text2">{item.dataVisita ? formatarData(item.dataVisita) : "—"}</Td>
                  <Td>
                    <Select
                      value={item.status}
                      disabled={carregando === item.id}
                      onChange={(e) => alterarStatus(item.id, e.target.value)}
                      className="h-8 w-[180px] border-transparent text-xs font-semibold shadow-sm focus:border-cda-blue"
                      style={{ ...BADGE_VARIANT_STYLE[badge.variant], accentColor: "var(--cda-blue)", colorScheme: "light" }}
                    >
                      {Object.entries(STATUS_INTERESSADO_BADGE).map(([valor, { label }]) => (
                        <option key={valor} value={valor} style={{ color: "initial", backgroundColor: "white" }}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </Td>
                  <Td>
                    <IconButton icon={Pencil} label="Editar interessado" size="sm" onClick={() => setEditando(item)} />
                  </Td>
                </Tr>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <EditarInteressadoModal item={editando} turmas={turmas} onClose={() => setEditando(null)} />
    </>
  );
}
