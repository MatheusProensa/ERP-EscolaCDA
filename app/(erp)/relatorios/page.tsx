import { Download, FileText, AlertCircle, TrendingUp, Users, Boxes } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";

const RELATORIOS = [
  {
    titulo: "Inadimplentes",
    descricao: "Alunos com mensalidades em atraso, com responsável, telefone e dias de atraso.",
    href: "/api/relatorios/inadimplentes",
    icon: AlertCircle,
    cor: "#DC2626",
  },
  {
    titulo: "Receita mensal",
    descricao: "Previsto vs. recebido por mês do ano letivo atual, com taxa de recebimento.",
    href: "/api/relatorios/receita-mensal",
    icon: TrendingUp,
    cor: "#16A34A",
  },
  {
    titulo: "Histórico de alunos",
    descricao: "Cadastro completo de todos os alunos, com turma, situação e responsável.",
    href: "/api/relatorios/alunos",
    icon: Users,
    cor: "#1A6FD8",
  },
  {
    titulo: "Estoque",
    descricao: "Itens cadastrados, quantidade, mínimo e situação de reposição.",
    href: "/api/relatorios/estoque",
    icon: Boxes,
    cor: "#D97706",
  },
];

export default function RelatoriosPage() {
  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Exportações em CSV ou PDF" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {RELATORIOS.map((r) => {
          const Icon = r.icon;
          return (
            <Card key={r.titulo} className="flex flex-col p-5">
              <div
                className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${r.cor}1A` }}
              >
                <Icon className="h-5 w-5" style={{ color: r.cor }} />
              </div>
              <h3 className="text-sm font-semibold text-cda-text">{r.titulo}</h3>
              <p className="mt-1 flex-1 text-sm text-cda-text2">{r.descricao}</p>
              <div className="mt-4 flex gap-2">
                <a
                  href={r.href}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-cda-blue px-3 py-2 text-sm font-medium text-white hover:bg-cda-blue/90"
                >
                  <Download className="h-4 w-4" />
                  CSV
                </a>
                <a
                  href={`${r.href}?formato=pdf`}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-cda-navy px-3 py-2 text-sm font-medium text-white hover:bg-cda-navy/90"
                >
                  <FileText className="h-4 w-4" />
                  PDF
                </a>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
