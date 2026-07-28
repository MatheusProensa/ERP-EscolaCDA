"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Aluno } from "@prisma/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PhotoUpload } from "@/components/ui/PhotoUpload";
import { formatarCPF } from "@/lib/utils";
import { CensoCampos } from "./CensoCampos";

function paraInputDate(data: Date): string {
  return new Date(data).toISOString().slice(0, 10);
}

export function EditarAlunoForm({ aluno }: { aluno: Aluno }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [foto, setFoto] = useState<string | null>(aluno.foto);
  const [nome, setNome] = useState(aluno.nome);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      nome: fd.get("nome"),
      dataNascimento: fd.get("dataNascimento"),
      naturalidade: fd.get("naturalidade"),
      cpf: fd.get("cpf"),
      rg: fd.get("rg"),
      certidaoNascimento: fd.get("certidaoNascimento"),
      foto,
      endereco: fd.get("endereco"),
      bairro: fd.get("bairro"),
      cidade: fd.get("cidade"),
      cep: fd.get("cep"),
      tipoSanguineo: fd.get("tipoSanguineo"),
      convenioMedico: fd.get("convenioMedico"),
      medicacaoContinua: fd.get("medicacaoContinua"),
      alergias: fd.get("alergias"),
      restricoes: fd.get("restricoes"),
      necessidadesEsp: fd.get("necessidadesEsp"),
      autorizacaoImagem: fd.get("autorizacaoImagem") === "on",
      nomeSocial: fd.get("nomeSocial"),
      sexo: fd.get("sexo"),
      racaCor: fd.get("racaCor"),
      povoIndigena: fd.get("povoIndigena"),
      nacionalidade: fd.get("nacionalidade"),
      municipioNasc: fd.get("municipioNasc"),
      ufNasc: fd.get("ufNasc"),
      filiacao1: fd.get("filiacao1"),
      filiacao2: fd.get("filiacao2"),
      bolsaFamilia: fd.get("bolsaFamilia") === "on",
      deficiencia: fd.get("deficiencia") === "on",
      tipoDeficiencia: fd.get("tipoDeficiencia"),
      recursosAcessib: fd.get("recursosAcessib"),
      nis: fd.get("nis"),
    };

    const res = await fetch(`/api/alunos/${aluno.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível salvar as alterações.");
      return;
    }

    router.push(`/alunos/${aluno.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Card title="Foto" className="p-5">
        <PhotoUpload value={foto} onChange={setFoto} nome={nome} />
      </Card>

      <Card title="Dados do aluno" className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Nome completo"
            name="nome"
            required
            defaultValue={aluno.nome}
            className="sm:col-span-2"
            onChange={(e) => setNome(e.target.value)}
          />
          <Input
            label="Data de nascimento"
            name="dataNascimento"
            type="date"
            required
            defaultValue={paraInputDate(aluno.dataNascimento)}
          />
          <Input
            label="CPF (opcional)"
            name="cpf"
            defaultValue={aluno.cpf ? formatarCPF(aluno.cpf) : ""}
            placeholder="000.000.000-00"
          />
          <Input label="RG (opcional)" name="rg" defaultValue={aluno.rg ?? ""} />
          <Input
            label="Certidão de nascimento"
            name="certidaoNascimento"
            defaultValue={aluno.certidaoNascimento ?? ""}
            className="sm:col-span-2"
          />
        </div>
      </Card>

      <Card title="Dados do Censo Escolar" className="p-5">
        <CensoCampos aluno={aluno} />
      </Card>

      <Card title="Endereço" className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Endereço" name="endereco" defaultValue={aluno.endereco ?? ""} className="sm:col-span-2" />
          <Input label="Bairro" name="bairro" defaultValue={aluno.bairro ?? ""} />
          <Input label="Cidade" name="cidade" defaultValue={aluno.cidade ?? "Santa Maria"} />
          <Input label="CEP" name="cep" defaultValue={aluno.cep ?? ""} />
        </div>
      </Card>

      <Card title="Saúde" className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Tipo sanguíneo" name="tipoSanguineo" defaultValue={aluno.tipoSanguineo ?? ""} placeholder="O+" />
          <Input label="Convênio médico" name="convenioMedico" defaultValue={aluno.convenioMedico ?? ""} placeholder="Nenhum" />
          <Input
            label="Alergias"
            name="alergias"
            defaultValue={aluno.alergias ?? ""}
            placeholder="Nenhuma"
            className="sm:col-span-2"
          />
          <Input
            label="Restrições alimentares"
            name="restricoes"
            defaultValue={aluno.restricoes ?? ""}
            placeholder="Nenhuma"
            className="sm:col-span-2"
          />
          <Input
            label="Medicação contínua"
            name="medicacaoContinua"
            defaultValue={aluno.medicacaoContinua ?? ""}
            placeholder="Nenhuma"
            className="sm:col-span-2"
          />
          <Input
            label="Necessidades especiais"
            name="necessidadesEsp"
            defaultValue={aluno.necessidadesEsp ?? ""}
            placeholder="Nenhuma"
            className="sm:col-span-2"
          />
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-cda-text2">
          <input
            type="checkbox"
            name="autorizacaoImagem"
            defaultChecked={aluno.autorizacaoImagem}
            className="h-4 w-4 rounded border-cda-border"
          />
          Responsável autoriza o uso de imagem da criança
        </label>
      </Card>

      {error && <p className="text-sm text-cda-red">{error}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          Salvar alterações
        </Button>
      </div>
    </form>
  );
}
