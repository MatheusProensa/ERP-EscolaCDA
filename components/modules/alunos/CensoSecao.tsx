"use client";

import Link from "next/link";
import { ChevronDown, Pencil } from "lucide-react";
import type { Aluno } from "@prisma/client";
import { Badge } from "@/components/ui/Badge";
import { formatarData } from "@/lib/utils";
import { SEXO_LABEL, RACA_COR_LABEL, NACIONALIDADE_LABEL, UFS } from "@/lib/censo";

function Campo({
  label,
  value,
  faltando,
}: {
  label: string;
  value: string;
  faltando?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <span className="text-cda-text3">{label}: </span>
        <span className="text-cda-text">{value}</span>
      </div>
      {faltando && <Badge variant="amber">Faltando para o censo</Badge>}
    </div>
  );
}

export function CensoSecao({ aluno, podeEditar = true }: { aluno: Aluno; podeEditar?: boolean }) {
  const ufNome = aluno.ufNasc ? (UFS.find((u) => u.sigla === aluno.ufNasc)?.nome ?? aluno.ufNasc) : null;
  const pendencias = [!aluno.sexo, !aluno.racaCor, !aluno.filiacao1].filter(Boolean).length;

  return (
    <details className="group rounded-[10px] border border-cda-border bg-cda-surface">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-cda-text">Dados do Censo Escolar</h3>
          {pendencias > 0 && <Badge variant="amber">{pendencias} pendente(s)</Badge>}
        </div>
        <div className="flex items-center gap-3">
          {podeEditar && (
            <Link
              href={`/alunos/${aluno.id}/editar`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-xs font-medium text-cda-blue hover:underline"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Link>
          )}
          <ChevronDown className="h-4 w-4 text-cda-text3 transition-transform group-open:rotate-180" />
        </div>
      </summary>

      <div className="grid grid-cols-1 gap-x-6 gap-y-2 border-t border-cda-border p-5 text-sm sm:grid-cols-2">
        <Campo label="Nome social" value={aluno.nomeSocial ?? "Não informado"} />
        <Campo label="Sexo" value={aluno.sexo ? SEXO_LABEL[aluno.sexo] : "Não informado"} faltando={!aluno.sexo} />
        <Campo
          label="Raça/Cor"
          value={aluno.racaCor ? RACA_COR_LABEL[aluno.racaCor] : "Não informado"}
          faltando={!aluno.racaCor}
        />
        {aluno.racaCor === "INDIGENA" && (
          <Campo label="Povo indígena" value={aluno.povoIndigena ?? "Não informado"} />
        )}
        <Campo label="Nacionalidade" value={NACIONALIDADE_LABEL[aluno.nacionalidade]} />
        {aluno.nacionalidade === "BRASILEIRA" ? (
          <>
            <Campo label="UF de nascimento" value={ufNome ?? "Não informado"} />
            <Campo label="Município de nascimento" value={aluno.municipioNasc ?? "Não informado"} />
          </>
        ) : (
          <Campo label="Naturalidade" value={aluno.naturalidade ?? "Não informado"} />
        )}
        <Campo label="Nome da mãe (Filiação 1)" value={aluno.filiacao1 ?? "Não informado"} faltando={!aluno.filiacao1} />
        <Campo label="Nome do pai (Filiação 2)" value={aluno.filiacao2 ?? "Não informado"} />
        <Campo label="Recebe Bolsa Família" value={aluno.bolsaFamilia ? "Sim" : "Não"} />
        <Campo label="Possui deficiência" value={aluno.deficiencia ? "Sim" : "Não"} />
        {aluno.deficiencia && (
          <>
            <Campo label="Tipo de deficiência" value={aluno.tipoDeficiencia ?? "Não informado"} />
            <Campo label="Recursos de acessibilidade" value={aluno.recursosAcessib ?? "Não informado"} />
          </>
        )}
        <Campo label="NIS/PIS do aluno" value={aluno.nis ?? "Não informado"} />
        <Campo label="Certidão de nascimento" value={aluno.certidaoNascimento ?? "Não informado"} />
        <Campo label="Última atualização" value={formatarData(aluno.updatedAt)} />
      </div>
    </details>
  );
}
