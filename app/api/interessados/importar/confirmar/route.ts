import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { formatarNomePessoa } from "@/lib/utils";
import { avisarMudanca } from "@/lib/liveUpdate";
import { parsarDataBr, type NovoInteressado } from "@/lib/importarInteressados";

/** Aplica só os itens marcados na tela de pré-visualização (o GET/POST de
 * .../importar não grava nada sozinho) — cria cada Interessado selecionado,
 * status inicial AGUARDANDO (mesmo padrão do cadastro manual). Mesmo
 * espírito do confirmar de Alunos/Funcionários. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const body = await req.json();
    const itens: NovoInteressado[] = Array.isArray(body?.itens) ? body.itens : [];
    if (itens.length === 0) return NextResponse.json({ error: "Nenhum item selecionado." }, { status: 400 });
    if (itens.length > 1000) return NextResponse.json({ error: "Muitos itens de uma vez." }, { status: 400 });

    let criados = 0;

    await prisma.$transaction(async (tx) => {
      for (const item of itens) {
        const nomeCrianca = item?.nomeCrianca?.trim();
        const nomeResponsavel = item?.nomeResponsavel?.trim();
        const telefone = item?.telefoneResponsavel?.trim();
        if (!nomeCrianca || !nomeResponsavel || !telefone) continue;

        // Turma desejada só quando ainda existe (pode ter sido excluída entre
        // a pré-visualização e a confirmação) — se sumiu, guarda o nome como
        // texto livre em vez de falhar o item inteiro.
        let turmaDesejadaId: string | null = null;
        let interesseTexto = item.interesseTexto ?? null;
        if (item.turmaDesejadaId) {
          const turma = await tx.turma.findUnique({ where: { id: item.turmaDesejadaId } });
          if (turma) turmaDesejadaId = turma.id;
          else if (item.turmaDesejadaTexto) interesseTexto = interesseTexto ? `${item.turmaDesejadaTexto} — ${interesseTexto}` : item.turmaDesejadaTexto;
        } else if (item.turmaDesejadaTexto) {
          interesseTexto = interesseTexto ? `${item.turmaDesejadaTexto} — ${interesseTexto}` : item.turmaDesejadaTexto;
        }

        await tx.listaEspera.create({
          data: {
            nomeCrianca: formatarNomePessoa(nomeCrianca),
            dataNascimento: item.dataNascimento ? parsarDataBr(item.dataNascimento) : null,
            nomeResponsavel: formatarNomePessoa(nomeResponsavel),
            telefoneResponsavel: telefone,
            emailResponsavel: item.emailResponsavel || null,
            turmaDesejadaId,
            interesseTexto,
            oQueBusca: item.oQueBusca || null,
            observacoes: item.observacoes || null,
            status: "AGUARDANDO",
          },
        });
        criados++;
      }

      if (criados > 0) {
        await tx.logAtividade.create({
          data: {
            acao: `Importação de planilha criou ${criados} interessado(s)`,
            entidade: "ListaEspera",
            entidadeId: "importacao",
            usuario: session.user.name ?? "Usuário",
          },
        });
      }
    });

    if (criados > 0) after(() => avisarMudanca("interessados"));
    return NextResponse.json({ criados });
  } catch (err) {
    return erroApi(err);
  }
}
