import { auth } from "@/lib/auth";
import { podeVerModulo } from "@/lib/permissoes";
import { DashboardAdmin } from "@/components/modules/dashboard/DashboardAdmin";
import { DashboardPedagogico } from "@/components/modules/dashboard/DashboardPedagogico";
import { DashboardAdministrativo } from "@/components/modules/dashboard/DashboardAdministrativo";
import { DashboardGenerico } from "@/components/modules/dashboard/DashboardGenerico";

export default async function DashboardPage() {
  const session = await auth();
  const role = session!.user.role;
  const permissoes = session!.user.permissoes;
  const nome = session!.user.name ?? "";

  // Cada dashboard de Role mostra contagem de setores específicos (ex.:
  // Administrativo mostra Funcionários/Estoque/Chaves) — mas a grade de
  // permissões pode ter restringido a pessoa a um recorte que não tem nada a
  // ver com isso (achado real: nutricionista com Role "Administrativo" só
  // pra existir num dos 5 perfis fixos, mas com acesso de verdade só a
  // Cardápio pela grade). Sem nenhum dos setores do dashboard do Role,
  // melhor o genérico (atalhos calculados pela grade de verdade) do que uma
  // tela quase vazia ou, pior, com contagem de setor que a pessoa nem abre.
  const temAcessoPedagogico = podeVerModulo("/alunos", role, permissoes) || podeVerModulo("/academico", role, permissoes);
  const temAcessoAdministrativo =
    podeVerModulo("/funcionarios", role, permissoes) || podeVerModulo("/estoque", role, permissoes) || podeVerModulo("/chaves", role, permissoes);

  // Achado real (set/2026, relatado pelo dono): deu "tudo" pra alguém com
  // Perfil "Administrativo" na grade, esperando o painel completo (igual ao
  // Admin) — e continuou vendo só o recorte estreito de Funcionários/Estoque/
  // Chaves, porque o painel era escolhido só pelo Perfil, sem olhar a grade
  // de verdade. Quem tem acesso amplo dos DOIS lados (pedagógico E
  // administrativo) merece o painel completo, não importa o Perfil —
  // DashboardAdmin já confere a grade de verdade card por card
  // (podeVerModulo), então é seguro mostrar pra qualquer um: quem não acessa
  // um módulo só vê aquele card com 0/oculto, igual já acontecia pro
  // Admin/Direção com acesso restringido pela grade.
  if (temAcessoPedagogico && temAcessoAdministrativo) {
    return <DashboardAdmin nome={nome} role={role} permissoes={permissoes} />;
  }

  if (role === "PEDAGOGICO") {
    if (!temAcessoPedagogico) return <DashboardGenerico nome={nome} role={role} permissoes={permissoes} />;
    return <DashboardPedagogico nome={nome} role={role} permissoes={permissoes} />;
  }
  if (role === "ADMINISTRATIVO") {
    if (!temAcessoAdministrativo) return <DashboardGenerico nome={nome} role={role} permissoes={permissoes} />;
    return <DashboardAdministrativo nome={nome} role={role} permissoes={permissoes} />;
  }
  // FINANCEIRO não tem dashboard próprio — a escola não gerencia
  // mensalidade/pagamento dentro do sistema (usa o Banrisul pra isso). ADMIN
  // e DIRECAO caem aqui também; o DashboardAdmin já confere a grade de
  // verdade card por card (não é role-only).
  return <DashboardAdmin nome={nome} role={role} permissoes={permissoes} />;
}
