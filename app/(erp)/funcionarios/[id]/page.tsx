import { notFound } from "next/navigation";
import Link from "next/link";
import { Phone, Mail, Calendar, Cake, Pencil, Clock, ShieldCheck, UserPlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { DocumentosFuncionario } from "@/components/modules/funcionarios/DocumentosFuncionario";
import { EscutaAoVivo } from "@/components/ui/EscutaAoVivo";
import { podeEditarModulo, ROLE_LABEL, ROLE_BADGE_VARIANT } from "@/lib/permissoes";
import { formatarCPF, formatarData, formatarTelefone } from "@/lib/utils";
import { calcularMes, minParaHora, type RegistroPontoDia } from "@/lib/ponto";

/** Achado de auditoria externa (set/2026): a ficha era `max-w-2xl` centralizada
 * em 1 coluna, sem foto, com o nome duplicado (H1 do cabeçalho + H2 do Card
 * logo abaixo). Vira grade de 2 colunas larga, mesmo padrão da ficha de
 * Aluno — que já é a referência do sistema. Foto de funcionário fica de fora
 * dessa leva de propósito: precisa de uma coluna nova no banco
 * (Funcionario.foto), e esse ambiente não alcança o banco de produção pra
 * migrar (mesma trava de sempre) — fica pro dono rodar localmente quando
 * quiser esse pedaço. Até lá, Avatar com iniciais no tamanho grande. */
export default async function FuncionarioPerfilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const podeEditar = podeEditarModulo("/funcionarios", session?.user.role ?? "", session?.user.permissoes);
  const [funcionario, registros] = await Promise.all([
    prisma.funcionario.findUnique({
      where: { id },
      include: { documentos: { orderBy: { createdAt: "desc" } } },
    }),
    prisma.registroPonto.findMany({ where: { funcionarioId: id }, orderBy: { data: "asc" } }),
  ]);

  if (!funcionario) notFound();

  // Ponte com Usuários: sem relação de verdade no banco entre Funcionario e
  // User (achado de auditoria externa também citou isso — "são a mesma
  // pessoa em duas telas, sem ponte nenhuma"), então casa por e-mail, melhor
  // esforço. Só informa "tem acesso" quando bate — nunca afirma "sem acesso"
  // como certeza absoluta, porque o e-mail pode só estar diferente.
  const usuarioVinculado = funcionario.email
    ? await prisma.user.findUnique({ where: { email: funcionario.email } })
    : null;

  const dias = calcularMes(registros as RegistroPontoDia[], funcionario.jornadaPrevistaMinutos ?? 0);
  const saldoAtual = dias.length > 0 ? dias[dias.length - 1].saldoAcumulado : 0;

  // Campos opcionais vazios ficam ocultos — cinco "Não informado" em fila
  // davam impressão de cadastro abandonado (achado de auditoria externa).
  // "Jornada prevista" é exceção: fica visível mesmo vazia, porque é o campo
  // que trava o cálculo do Ponto quando falta.
  const camposOpcionais = [
    { icon: ShieldCheck, label: "CPF", valor: funcionario.cpf ? formatarCPF(funcionario.cpf) : null },
    { icon: Cake, label: "Nascimento", valor: funcionario.dataNascimento ? formatarData(funcionario.dataNascimento) : null },
    { icon: Phone, label: "Telefone", valor: funcionario.telefone ? formatarTelefone(funcionario.telefone) : null },
    { icon: Mail, label: "E-mail", valor: funcionario.email },
  ];
  const preenchidos = camposOpcionais.filter((c) => c.valor);
  const vazios = camposOpcionais.length - preenchidos.length;

  return (
    <div>
      <EscutaAoVivo modulo="funcionarios" />
      <PageHeader
        title={funcionario.nome}
        subtitle={`${funcionario.cargo} · ${funcionario.setor}`}
        breadcrumb={[{ label: "Funcionários", href: "/funcionarios" }, { label: funcionario.nome }]}
        action={
          podeEditar && (
            <Button href={`/funcionarios/${funcionario.id}/editar`} variant="outline">
              <Pencil className="h-3.5 w-3.5" />
              Editar cadastro
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card className="p-5">
            <div className="flex items-start gap-4">
              <Avatar nome={funcionario.nome} size="xl" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-cda-text2">
                  <Badge variant="cat5">{funcionario.setor}</Badge> <span className="ml-1">{funcionario.cargo}</span>
                </p>

                <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  <InfoItem icon={Calendar} label="Admissão" value={formatarData(funcionario.admissao)} />
                  {preenchidos.map((c) => (
                    <InfoItem key={c.label} icon={c.icon} label={c.label} value={c.valor!} />
                  ))}
                  <InfoItem
                    icon={Clock}
                    label="Jornada prevista"
                    value={
                      funcionario.jornadaPrevistaMinutos != null
                        ? `${minParaHora(funcionario.jornadaPrevistaMinutos)} por dia`
                        : "Não definida"
                    }
                  />
                </div>

                {vazios > 0 && (
                  <p className="mt-3 text-xs text-cda-text3">
                    {vazios} campo{vazios === 1 ? "" : "s"} não informado{vazios === 1 ? "" : "s"}.{" "}
                    {podeEditar && (
                      <Link href={`/funcionarios/${funcionario.id}/editar`} className="font-medium text-cda-blue hover:underline">
                        Completar cadastro
                      </Link>
                    )}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <DocumentosFuncionario funcionarioId={funcionario.id} documentos={funcionario.documentos} podeEditar={podeEditar} />
        </div>

        <div className="flex flex-col gap-5">
          <Card title="Ponto">
            <div className="flex flex-col gap-3 p-5">
              <InfoItem icon={Clock} label="Participa do ponto" value={funcionario.participaPonto ? "Sim" : "Não"} />
              {funcionario.participaPonto && (
                <>
                  <InfoItem
                    icon={Clock}
                    label="Jornada prevista"
                    value={funcionario.jornadaPrevistaMinutos != null ? `${minParaHora(funcionario.jornadaPrevistaMinutos)} por dia` : "Não definida"}
                  />
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 shrink-0 text-cda-text3" />
                    <span className="text-cda-text3">Saldo acumulado: </span>
                    <Badge variant="count">{minParaHora(saldoAtual)}</Badge>
                  </div>
                  <Button href={`/ponto/${funcionario.id}`} variant="outline" size="sm" className="mt-1 w-full">
                    Ver lançamentos
                  </Button>
                </>
              )}
            </div>
          </Card>

          <Card title="Acesso ao sistema">
            <div className="flex flex-col gap-3 p-5">
              {usuarioVinculado ? (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-cda-text3" />
                    <span className="text-cda-text3">Perfil: </span>
                    <Badge variant={ROLE_BADGE_VARIANT[usuarioVinculado.role] ?? "neutral"}>
                      {ROLE_LABEL[usuarioVinculado.role] ?? usuarioVinculado.role}
                    </Badge>
                  </div>
                  <Button href={`/usuarios/${usuarioVinculado.id}`} variant="outline" size="sm" className="w-full">
                    Ver perfil de acesso
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-cda-text3">
                    Não achamos um usuário com esse e-mail. Se {funcionario.nome.split(" ")[0]} já tem login, confere se o
                    e-mail do cadastro bate com o de acesso.
                  </p>
                  <Button href="/usuarios" variant="outline" size="sm" className="w-full">
                    <UserPlus className="h-3.5 w-3.5" />
                    Ir pra Usuários
                  </Button>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-cda-text3" />
      <span className="text-cda-text3">{label}: </span>
      <span className="text-cda-text">{value}</span>
    </div>
  );
}
