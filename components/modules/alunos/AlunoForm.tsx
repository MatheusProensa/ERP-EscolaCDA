"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Turma } from "@prisma/client";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PhotoUpload } from "@/components/ui/PhotoUpload";
import { CensoCampos } from "./CensoCampos";

export function AlunoForm({ turmas }: { turmas: Turma[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [nome, setNome] = useState("");

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
      turmaId: fd.get("turmaId"),
      valorMensalidade: fd.get("valorMensalidade"),
      responsavel: {
        nome: fd.get("responsavelNome"),
        parentesco: fd.get("responsavelParentesco"),
        telefone: fd.get("responsavelTelefone"),
        email: fd.get("responsavelEmail"),
        cpf: fd.get("responsavelCpf"),
      },
    };

    const res = await fetch("/api/alunos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível salvar o aluno.");
      return;
    }

    const aluno = await res.json();
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
            className="sm:col-span-2"
            onChange={(e) => setNome(e.target.value)}
          />
          <Input label="Data de nascimento" name="dataNascimento" type="date" required />
          <Input label="CPF (opcional)" name="cpf" placeholder="000.000.000-00" />
          <Input label="RG (opcional)" name="rg" />
          <Input label="Certidão de nascimento" name="certidaoNascimento" className="sm:col-span-2" />
        </div>
      </Card>

      <Card title="Dados do Censo Escolar" className="p-5">
        <CensoCampos />
      </Card>

      <Card title="Endereço" className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Endereço" name="endereco" className="sm:col-span-2" />
          <Input label="Bairro" name="bairro" />
          <Input label="Cidade" name="cidade" defaultValue="Santa Maria" />
          <Input label="CEP" name="cep" />
        </div>
      </Card>

      <Card title="Saúde" className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Tipo sanguíneo" name="tipoSanguineo" placeholder="O+" />
          <Input label="Convênio médico" name="convenioMedico" placeholder="Nenhum" />
          <Input label="Alergias" name="alergias" placeholder="Nenhuma" className="sm:col-span-2" />
          <Input label="Restrições alimentares" name="restricoes" placeholder="Nenhuma" className="sm:col-span-2" />
          <Input label="Medicação contínua" name="medicacaoContinua" placeholder="Nenhuma" className="sm:col-span-2" />
          <Input label="Necessidades especiais" name="necessidadesEsp" placeholder="Nenhuma" className="sm:col-span-2" />
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-cda-text2">
          <input type="checkbox" name="autorizacaoImagem" className="h-4 w-4 rounded border-cda-border" />
          Responsável autoriza o uso de imagem da criança
        </label>
      </Card>

      <Card title="Responsável" className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Nome do responsável" name="responsavelNome" required className="sm:col-span-2" />
          <Select label="Parentesco" name="responsavelParentesco" defaultValue="Mãe">
            <option value="Mãe">Mãe</option>
            <option value="Pai">Pai</option>
            <option value="Avô/Avó">Avô/Avó</option>
            <option value="Outro">Outro</option>
          </Select>
          <Input label="Telefone" name="responsavelTelefone" required placeholder="(55) 99999-9999" />
          <Input label="E-mail" name="responsavelEmail" type="email" />
          <Input label="CPF" name="responsavelCpf" />
        </div>
      </Card>

      <Card title="Matrícula" className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Turma" name="turmaId" required defaultValue="">
            <option value="" disabled>
              Selecione a turma
            </option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </Select>
          <Input
            label="Valor da mensalidade"
            name="valorMensalidade"
            type="number"
            step="0.01"
            defaultValue="450"
          />
        </div>
        <p className="mt-3 text-xs text-cda-text3">
          Ao confirmar, 12 mensalidades serão geradas automaticamente para o ano letivo.
        </p>
      </Card>

      {error && <p className="text-sm text-cda-red">{error}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          Confirmar matrícula
        </Button>
      </div>
    </form>
  );
}
