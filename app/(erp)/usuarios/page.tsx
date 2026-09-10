import { Download, KeyRound, Users, Crown, Wallet, UserCog, GraduationCap, type LucideIcon } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { BarraFiltro } from "@/components/ui/BarraFiltro";
import { MetricCard, type MetricTone } from "@/components/ui/MetricCard";
import { NovoUsuarioModal } from "@/components/modules/usuarios/NovoUsuarioModal";
import { UsuarioCard } from "@/components/modules/usuarios/UsuarioCard";
import { podeEditarModulo } from "@/lib/permissoes";
import { ROLES_ATIVAS, ROLE_LABEL, ROLE_BADGE_VARIANT } from "@/lib/permissoes";
import { EscutaAoVivo } from "@/components/ui/EscutaAoVivo";

// Ícone + tom (mesma cor do badge/anel do cargo, ROLE_BADGE_VARIANT já é um
// MetricTone válido) pra cada cargo que ganha card de resumo no topo — Admin
// fica de fora (é só o dono, não agrega nada olhar "1" separado).
const RESUMO_CARGO: { role: (typeof ROLES_ATIVAS)[number]; icon: LucideIcon }[] = [
  { role: "DIRECAO", icon: Crown },
  { role: "PEDAGOGICO", icon: GraduationCap },
  { role: "FINANCEIRO", icon: Wallet },
  { role: "ADMINISTRATIVO", icon: UserCog },
];

// Ordem de exibição por hierarquia de cargo, não alfabética por nome — antes
// a listagem misturava Admin/Direção/Financeiro/Administrativo numa ordem que
// só dependia do primeiro nome de cada um, sem transmitir a estrutura da
// equipe. Cargos legados (fora de ROLES_ATIVAS, ex.: SECRETARIA) vão pro fim.
const ORDEM_CARGO = new Map(ROLES_ATIVAS.map((role, i) => [role, i]));
function posicaoCargo(role: string): number {
  return ORDEM_CARGO.get(role as (typeof ROLES_ATIVAS)[number]) ?? ROLES_ATIVAS.length;
}

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ cargo?: string; busca?: string }>;
}) {
  const { cargo, busca } = await searchParams;
  const session = await auth();
  // Achado real (revisão de set/2026): quem tem "Só visualizar" em Usuários
  // via a grade via ainda o botão de criar usuário novo — sério porque esse
  // setor mexe com acesso ao sistema inteiro, não só dado de um cadastro.
  const podeEditar = podeEditarModulo("/usuarios", session?.user.role ?? "", session?.user.permissoes);

  const todos = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true, foto: true, createdAt: true, pedidoResetSenhaEm: true },
  });

  const contagemPorCargo = new Map<string, number>();
  for (const u of todos) contagemPorCargo.set(u.role, (contagemPorCargo.get(u.role) ?? 0) + 1);

  const filtrados = todos
    .filter((u) => !cargo || u.role === cargo)
    .filter(
      (u) =>
        !busca ||
        u.name.toLowerCase().includes(busca.toLowerCase()) ||
        u.email.toLowerCase().includes(busca.toLowerCase())
    )
    .sort((a, b) => posicaoCargo(a.role) - posicaoCargo(b.role) || a.name.localeCompare(b.name, "pt-BR"));

  const pedidosPendentes = todos.filter((u) => u.pedidoResetSenhaEm).length;

  return (
    <div>
      <EscutaAoVivo modulo="usuarios" />
      <PageHeader
        title="Usuários"
        subtitle="Quem tem acesso ao sistema — clique numa pessoa pra ver e editar o perfil"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button href="/api/backup" variant="outline">
              <Download className="h-4 w-4" />
              Baixar backup
            </Button>
            {podeEditar && <NovoUsuarioModal />}
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard icon={Users} tone="neutral" value={todos.length} label="Total de usuários" href="/usuarios" />
        {RESUMO_CARGO.filter((r) => contagemPorCargo.has(r.role)).map((r) => (
          <MetricCard
            key={r.role}
            icon={r.icon}
            tone={ROLE_BADGE_VARIANT[r.role] as MetricTone}
            value={contagemPorCargo.get(r.role) ?? 0}
            label={ROLE_LABEL[r.role]}
            href={`/usuarios?cargo=${r.role}`}
          />
        ))}
      </div>

      {pedidosPendentes > 0 && (
        <Alert
          tone="warning"
          icon={KeyRound}
          title={
            pedidosPendentes === 1
              ? "1 pessoa pediu redefinição de senha"
              : `${pedidosPendentes} pessoas pediram redefinição de senha`
          }
          className="mb-5"
        >
          Marcadas abaixo com o ícone de chave.
        </Alert>
      )}

      <BarraFiltro
        buscaPlaceholder="Buscar por nome ou e-mail..."
        selects={[
          {
            paramName: "cargo",
            placeholder: "Todos os cargos",
            options: [
              { value: "", label: `Todos os cargos (${todos.length})` },
              ...ROLES_ATIVAS.filter((role) => contagemPorCargo.has(role)).map((role) => ({
                value: role,
                label: `${ROLE_LABEL[role]} (${contagemPorCargo.get(role) ?? 0})`,
              })),
            ],
          },
        ]}
        total={filtrados.length}
        totalGeral={todos.length}
      />

      {filtrados.length === 0 ? (
        <EmptyState title="Nenhum usuário encontrado." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((usuario) => (
            <UsuarioCard key={usuario.id} usuario={usuario} souEu={usuario.id === session?.user.id} />
          ))}
        </div>
      )}
    </div>
  );
}
