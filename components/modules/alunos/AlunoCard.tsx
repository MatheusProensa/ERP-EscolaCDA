import { Pencil } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatarCPF, formatarData } from "@/lib/utils";
import type { Aluno } from "@prisma/client";

export function AlunoCard({
  aluno,
  turmas,
  podeEditar = true,
}: {
  aluno: Aluno;
  turmas: string[];
  podeEditar?: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-4">
        <Avatar nome={aluno.nome} foto={aluno.foto} size="xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-cda-text">{aluno.nome}</h2>
            </div>
            {podeEditar && (
              <Button href={`/alunos/${aluno.id}/editar`} variant="outline" size="sm">
                <Pencil className="h-3.5 w-3.5" />
                Editar cadastro
              </Button>
            )}
          </div>
          <p className="mt-0.5 text-sm text-cda-text2">
            {turmas.length > 0 ? turmas.join(" · ") : "Sem turma"}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <InfoItem label="Data de nascimento" value={formatarData(aluno.dataNascimento)} />
            <InfoItem label="Naturalidade" value={aluno.naturalidade ?? "Não informado"} />
            <InfoItem label="CPF" value={aluno.cpf ? formatarCPF(aluno.cpf) : "Não informado"} />
            <InfoItem label="Certidão de nascimento" value={aluno.certidaoNascimento ?? "Não informado"} />
            <InfoItem
              label="Endereço"
              value={
                aluno.endereco
                  ? `${aluno.endereco}, ${aluno.bairro ?? ""} - ${aluno.cidade ?? ""}`
                  : "Não informado"
              }
            />
            <InfoItem label="CEP" value={aluno.cep ?? "Não informado"} />
            <InfoItem label="Tipo sanguíneo" value={aluno.tipoSanguineo ?? "Não informado"} />
            <InfoItem label="Convênio médico" value={aluno.convenioMedico ?? "Não informado"} />
            <InfoItem label="Alergias" value={aluno.alergias ?? "Nenhuma"} />
            <InfoItem label="Restrições alimentares" value={aluno.restricoes ?? "Nenhuma"} />
            <InfoItem label="Medicação contínua" value={aluno.medicacaoContinua ?? "Nenhuma"} />
            {aluno.necessidadesEsp && (
              <InfoItem label="Necessidades especiais" value={aluno.necessidadesEsp} />
            )}
            <InfoItem
              label="Autorização de uso de imagem"
              value={aluno.autorizacaoImagem ? "Autorizado" : "Não autorizado"}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-cda-text3">{label}: </span>
      <span className="text-cda-text">{value}</span>
    </div>
  );
}
