import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroApi } from "@/lib/apiError";
import { avisarMudanca } from "@/lib/liveUpdate";
import { parsarDataBr, type ItemFuncionario } from "@/lib/importarFuncionarios";

const CAMPOS_TEXTO = ["cargo", "setor", "telefone", "email"] as const;

/** Aplica só os itens que o usuário marcou na tela de pré-visualização
 * (app/api/funcionarios/importar não grava nada sozinho) — cria quem é novo,
 * atualiza campo a campo quem já existe. Reconfere cada item contra o banco
 * antes de gravar, não confia cegamente no que veio do client. Mesmo padrão
 * do confirmar de Alunos. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const body = await req.json();
    const itens: ItemFuncionario[] = Array.isArray(body?.itens) ? body.itens : [];
    if (itens.length === 0) return NextResponse.json({ error: "Nenhum item selecionado." }, { status: 400 });
    if (itens.length > 1000) return NextResponse.json({ error: "Muitos itens de uma vez." }, { status: 400 });

    let criados = 0;
    let atualizados = 0;
    const erros: string[] = [];

    for (const item of itens) {
      if (item?.tipo === "atualizar") {
        const funcionario = await prisma.funcionario.findUnique({ where: { id: item.funcionarioId } });
        if (!funcionario) continue;
        if (CAMPOS_TEXTO.includes(item.campo as (typeof CAMPOS_TEXTO)[number])) {
          const novo = String(item.novo ?? "").trim();
          if (!novo) continue;
          await prisma.funcionario.update({ where: { id: item.funcionarioId }, data: { [item.campo]: novo } });
          atualizados++;
        } else if (item.campo === "dataNascimento" || item.campo === "admissao") {
          const data = parsarDataBr(String(item.novo ?? ""));
          if (!data) continue;
          await prisma.funcionario.update({ where: { id: item.funcionarioId }, data: { [item.campo]: data } });
          atualizados++;
        }
      } else if (item?.tipo === "criar") {
        const admissao = parsarDataBr(item.admissao);
        if (!admissao || !item.nome?.trim() || !item.cargo?.trim() || !item.setor?.trim()) {
          erros.push(`${item.nome || "(sem nome)"}: dados incompletos`);
          continue;
        }
        try {
          await prisma.funcionario.create({
            data: {
              nome: item.nome.trim(),
              cpf: item.cpf || null,
              cargo: item.cargo.trim(),
              setor: item.setor.trim(),
              telefone: item.telefone || null,
              email: item.email || null,
              dataNascimento: item.dataNascimento ? parsarDataBr(item.dataNascimento) : null,
              admissao,
            },
          });
          criados++;
        } catch {
          // CPF único colidindo (já criado por outra linha da mesma leva, ou
          // cadastrado por outra pessoa entre a pré-visualização e agora).
          erros.push(`${item.nome}: CPF já cadastrado`);
        }
      }
    }

    if (criados + atualizados > 0) {
      await prisma.logAtividade.create({
        data: {
          acao: `Importação de planilha criou ${criados} e atualizou ${atualizados} funcionário(s)`,
          entidade: "Funcionario",
          entidadeId: "importacao",
          usuario: session.user.name ?? "Usuário",
        },
      });
      after(() => avisarMudanca("funcionarios"));
    }

    return NextResponse.json({ criados, atualizados, erros });
  } catch (err) {
    return erroApi(err);
  }
}
