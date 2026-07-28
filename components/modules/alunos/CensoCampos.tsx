"use client";

import { useState } from "react";
import type { Aluno } from "@prisma/client";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { UFS } from "@/lib/censo";

function Obrigatorio() {
  return <span className="text-cda-red"> *</span>;
}

export function CensoCampos({ aluno }: { aluno?: Aluno }) {
  const [nacionalidade, setNacionalidade] = useState<string>(aluno?.nacionalidade ?? "BRASILEIRA");
  const [racaCor, setRacaCor] = useState<string>(aluno?.racaCor ?? "");
  const [deficiencia, setDeficiencia] = useState(aluno?.deficiencia ?? false);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Select label={<>Sexo<Obrigatorio /></>} name="sexo" required defaultValue={aluno?.sexo ?? ""}>
        <option value="" disabled>
          Selecione
        </option>
        <option value="M">Masculino</option>
        <option value="F">Feminino</option>
      </Select>

      <Select
        label={<>Raça/Cor<Obrigatorio /></>}
        name="racaCor"
        required
        defaultValue={aluno?.racaCor ?? ""}
        onChange={(e) => setRacaCor(e.target.value)}
      >
        <option value="" disabled>
          Selecione
        </option>
        <option value="BRANCA">Branca</option>
        <option value="PRETA">Preta</option>
        <option value="PARDA">Parda</option>
        <option value="AMARELA">Amarela</option>
        <option value="INDIGENA">Indígena</option>
        <option value="NAO_DECLARADA">Não declarada</option>
      </Select>

      {racaCor === "INDIGENA" && (
        <Input label="Povo indígena" name="povoIndigena" defaultValue={aluno?.povoIndigena ?? ""} className="sm:col-span-2" />
      )}

      <Select
        label={<>Nacionalidade<Obrigatorio /></>}
        name="nacionalidade"
        required
        defaultValue={nacionalidade}
        onChange={(e) => setNacionalidade(e.target.value)}
      >
        <option value="BRASILEIRA">Brasileira</option>
        <option value="ESTRANGEIRA">Estrangeira</option>
      </Select>

      <Input label="Nome social" name="nomeSocial" defaultValue={aluno?.nomeSocial ?? ""} />

      {nacionalidade === "BRASILEIRA" ? (
        <>
          <Select label={<>UF de nascimento<Obrigatorio /></>} name="ufNasc" required defaultValue={aluno?.ufNasc ?? ""}>
            <option value="" disabled>
              Selecione
            </option>
            {UFS.map((u) => (
              <option key={u.sigla} value={u.sigla}>
                {u.nome}
              </option>
            ))}
          </Select>
          <Input
            label={<>Município de nascimento<Obrigatorio /></>}
            name="municipioNasc"
            required
            defaultValue={aluno?.municipioNasc ?? ""}
          />
        </>
      ) : (
        <Input
          label="Naturalidade"
          name="naturalidade"
          defaultValue={aluno?.naturalidade ?? ""}
          className="sm:col-span-2"
        />
      )}

      <Input
        label={<>Nome da mãe (Filiação 1)<Obrigatorio /></>}
        name="filiacao1"
        required
        defaultValue={aluno?.filiacao1 ?? ""}
        className="sm:col-span-2"
      />
      <Input
        label="Nome do pai (Filiação 2)"
        name="filiacao2"
        defaultValue={aluno?.filiacao2 ?? ""}
        className="sm:col-span-2"
      />

      <Input label="NIS/PIS do aluno" name="nis" defaultValue={aluno?.nis ?? ""} />

      <label className="flex items-center gap-2 text-sm text-cda-text2 sm:col-span-2">
        <input
          type="checkbox"
          name="bolsaFamilia"
          defaultChecked={aluno?.bolsaFamilia}
          className="h-4 w-4 rounded border-cda-border"
        />
        Recebe Bolsa Família
      </label>

      <label className="flex items-center gap-2 text-sm text-cda-text2 sm:col-span-2">
        <input
          type="checkbox"
          name="deficiencia"
          defaultChecked={aluno?.deficiencia}
          onChange={(e) => setDeficiencia(e.target.checked)}
          className="h-4 w-4 rounded border-cda-border"
        />
        Possui deficiência
      </label>

      {deficiencia && (
        <>
          <Input
            label="Tipo de deficiência"
            name="tipoDeficiencia"
            defaultValue={aluno?.tipoDeficiencia ?? ""}
            className="sm:col-span-2"
          />
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-medium text-cda-text2">
              Recursos de acessibilidade para avaliação
            </label>
            <textarea
              name="recursosAcessib"
              defaultValue={aluno?.recursosAcessib ?? ""}
              rows={3}
              className="w-full rounded-lg border border-cda-border bg-white px-3 py-2 text-sm text-cda-text outline-none transition-colors focus:border-cda-blue"
            />
          </div>
        </>
      )}
    </div>
  );
}
