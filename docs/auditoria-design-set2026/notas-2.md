# Notas brutas (ondas 3–4)

## Funcionários — lista
- OK: agrupamento por setor com um Card por setor + badge de contagem; badge de pendência de cadastro visível (era alert()).
- ACHADO (Alta): a lista de Funcionários e a de Alunos são estruturalmente diferentes sem motivo. Alunos: um Card único com tabela + abas `AcademicoTabs`. Funcionários: N Cards, um por setor, sem abas. Mesma tarefa (achar uma pessoa), duas estruturas.
- ACHADO (Média): o badge de pendência mostra a frase inteira quando é só uma pendência ("Sem jornada prevista definida — o Ponto não vai calcular horas extra/atraso corretamente") dentro de um badge de pílula. Um badge com 90 caracteres quebra a linha da tabela e deixa de parecer badge.
- ACHADO (Média): quando o filtro não acha nada, a página renderiza `grupos.length === 0` → um Card com tabela vazia E MAIS o `div` de grupos vazio; o `EmptyState` da tabela diz "Nenhum funcionário encontrado." mas não oferece "limpar filtro".
- ACHADO (Baixa): o botão de excluir tem label "Excluir funcionário de vez" (bom), mas não existe a ação "desativar" que o `ConfirmDialog` prevê via `secondaryAction` — o próprio componente foi escrito citando esse caso e a tabela não usa.

## Funcionários — perfil
- ACHADO (Média): a página é `max-w-2xl` centralizada, ao contrário de Alunos (grade de 3 colunas, largura cheia). Dois perfis de pessoa com layouts totalmente diferentes.
- ACHADO (Média): o `PageHeader` já mostra o nome como H1 e o Card repete o nome como H2 logo abaixo — título duplicado.
- ACHADO (Baixa): `InfoItem` usa o padrão "Rótulo: valor" na mesma linha e no mesmo tamanho (14px), com o rótulo em `text3` e o valor em `text`. Funciona, mas em `sm:grid-cols-2` os valores não alinham em coluna (cada rótulo tem largura diferente).
- ACHADO (Baixa): "Não informado" repetido em até 5 campos deixa a impressão de cadastro vazio; um resumo ("5 campos não informados") ou omitir os vazios seria mais legível.
- ACHADO (Baixa): não tem avatar grande nem foto — `PhotoUpload` existe (`Avatar size="xl"`), mas o perfil de funcionário usa `size="lg"` e o cadastro não tem foto.

## Funcionários — novo/editar
- OK: um único `FuncionarioForm` para criar e editar (era duplicado); Cancelar/Salvar alinhados à direita, rótulo do primário muda ("Salvar funcionário" / "Salvar alterações").
- ACHADO (Média): a validação é só `required` do HTML + erro de API num `<p>` vermelho no fim do formulário. Não há erro por campo (`Input` tem prop `error` e ninguém usa) — num formulário de 8 campos, o erro fica longe do campo que causou.
- ACHADO (Baixa): o placeholder do CPF carrega instrução ("000.000.000-00 (deixe em branco se não souber)") — placeholder não é lugar de instrução; existe espaço pra hint.
- ACHADO (Baixa): "Participação no Ponto e jornada prevista se configuram na tela de Ponto." é um `<p>` solto de 12px no fim do card, sem link pra /ponto.

## Ponto — lista
- ACHADO (Alta): `Badge variant={saldo < 0 ? "red" : saldo > 0 ? "green" : "gray"}` — três variantes DEPRECIADAS num cálculo novo, e pior: saldo positivo em verde/negativo em vermelho é decoração de estado sobre um dado que é neutro (banco de horas positivo não é "sucesso", negativo não é "erro"). O próprio sistema definiu que cor de status é exclusiva de estado.
- ACHADO (Média): a última coluna do cabeçalho é `<Th>{""}</Th>` em vez de `<ThActions />` (que existe exatamente pra isso).
- ACHADO (Média): a linha tem DOIS caminhos pra mesma tela — o nome é link pra `/ponto/[id]` e o botão "Lançar ponto" também. Redundante, e o botão ocupa a coluna mais valiosa em tela estreita.
- ACHADO (Baixa): o cabeçalho "Lançamentos em Setembro" muda de largura conforme o mês filtrado, deslocando as colunas seguintes.
- SUGESTÃO: subtítulo longuíssimo ("tolerância CLT, adicional noturno e banco de horas") — informação de ajuda, não de contexto.

## Horários da Equipe
- OK: estado vazio com CTA duplo (nova turma / novo aviso), bem resolvido.
- ACHADO (Média): o estado vazio usa `rounded-xl border-dashed` — um vocabulário de card que não existe em nenhum outro lugar do sistema (todo card é `rounded-[10px]` com borda sólida). O `EmptyState` do kit não foi usado.
- ACHADO (Baixa): `NovoBlocoButton` aparece como um cartão-fantasma no fim da grade E como botão no estado vazio; dois comportamentos visuais para o mesmo componente.
- ACHADO (Baixa): filtro de ano é `Select` + "Filtrar" — mesmo padrão divergente das outras telas.

## Estoque
- OK: `Tabs` (sublinhado) para seções da mesma página, extraído dessa tela; 4 métricas + 2 cards de resumo.
- ACHADO (Média): as métricas usam `tone="success"` para Entradas e `tone="warning"` para Saídas. Entrada e saída de material são CATEGORIAS de movimentação, não estados — verde/âmbar aqui é exatamente o uso decorativo que o handoff removeu do resto do sistema.
- ACHADO (Média): "Ver todos"/"Ver todas" nos cabeçalhos são `<button>` cru com classes de link (12px azul), enquanto o mesmo padrão no Dashboard (`MuralWidget`, `ProximosEventosWidget`) é `<Link>` de 14px. Dois tamanhos para a mesma ação.
- ACHADO (Baixa): o vazio "Nenhum item abaixo do mínimo" (Estoque) vs "Nenhum item abaixo do mínimo 🎉" (Dashboard Administrativo) — mesma frase, um com emoji.

## Chaves
- OK: grade responsiva ajustada (3 colunas no notebook), exportação condicional.
- ACHADO (Baixa): o `action` do PageHeader é um fragmento sem `flex`/`gap` — dois botões colados sem espaçamento definido (todas as outras telas usam `<div className="flex flex-wrap items-center gap-2">`).
- ACHADO (Baixa): mesmo problema em Interessados e Boletos (`<>...</>` sem wrapper flex).

## Documentos
- OK: agrupamento por categoria, Alert de vencidos com contagem no título (hierarquia correta, ao contrário do CensoAlerta).
- ACHADO (Média): o Alert lista TODOS os vencidos concatenados por " · " num parágrafo de 13px — com 6 documentos vira um bloco de texto ilegível. Deveria ser lista ou limitar a 2-3 + "e mais N".
- ACHADO (Baixa): o Alert de vencidos não tem `action` ("Ver documentos vencidos").

## Interessados
- OK: 4 métricas + tabela; `FilterSelect` com cor acompanhando o status (uso legítimo de `BADGE_VARIANT_STYLE`); 11 status com cores pensadas e documentadas.
- ACHADO (Média): `tone="warning"` em "Em andamento" — de novo cor de estado numa contagem que é etapa de funil, não problema.
- ACHADO (Baixa): 11 status é muito para reconhecer por cor; a paleta admite ~9 tons distintos e o próprio código reconhece isso. Sugestão: agrupar visualmente por fase (ação necessária / encerrado / matriculado) e usar o texto como diferenciador fino.

## Boletos
- ACHADO (Média): o Alert "Registro ainda não ligado" tem 3 linhas de texto corrido em 13px e nenhuma ação; é um aviso permanente que vai ficar na tela todos os dias até a configuração existir. Deveria ser dispensável ou compactado.
- ACHADO (Baixa): título "Registro ainda não ligado" é jargão interno; a secretaria não sabe o que "registro" significa nesse contexto.

## Usuários
- OK: grade de cards; Alert de pedidos de senha pendentes; permissão de edição conferida.
- ACHADO (Média): "Baixar backup" fica lado a lado com "Novo usuário" no cabeçalho e é visível para quem só visualiza (só `podeEditar` protege o "Novo usuário"). Baixar o backup do banco inteiro é a ação mais sensível do sistema e está com peso visual de ação secundária comum.
- ACHADO (Baixa): o Alert diz "Marcadas abaixo com o ícone de chave." — obriga a varrer 3 colunas de cards pra achar; sem filtro nem ordenação que traga os pendentes pro topo.
- ACHADO (Baixa): `EmptyState` sem Card em volta (ao contrário de Chaves/Mural/Documentos, que envolvem em `<Card className="p-0">`).

## Log de Atividades
- OK: paginação de 50, filtro por tipo com rótulo em português, badge categórica por entidade, exportação.
- ACHADO (Média): `Boleto` e `Aluno` compartilham `cat1`; `ListaEspera`, `Interessado` e `Funcionario` compartilham `cat5`. Numa tela cuja função é distinguir tipos por cor, três tipos com a mesma cor anula o recurso.
- ACHADO (Baixa): a lista é `divide-y` de linhas, não `Table` — é a única listagem do sistema que não usa o componente de tabela, então não herda hover, foco de teclado nem alinhamento de colunas.
- ACHADO (Baixa): paginação só "Anterior/Próxima", sem primeira/última nem salto — com muitos registros, chegar ao fim é inviável.
