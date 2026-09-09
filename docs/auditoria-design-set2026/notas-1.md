# Notas brutas da auditoria (ondas 1–2)

## Contexto geral
- Já existe um "handoff de design" aplicado em etapas (comentários no código citam etapas 1 a 6) + uma "auditoria visual de set/2026". Muita coisa óbvia já foi resolvida: tokens semânticos, Alert unificado, IconButton único, ConfirmDialog no lugar de window.confirm, loading.tsx por rota, foco de teclado global, alvo de toque de 44px na topbar.
- Portanto os achados que restam são de segunda ordem: consistência entre telas equivalentes, resíduos de variantes depreciadas, padrões de filtro divergentes, densidade.

## Componentes base
### Button
- OK: 5 variantes, 2 tamanhos, foco global, disabled coerente.
- ACHADO (Média): não existe tamanho de toque mínimo. `size="sm"` = 32px de altura; em tabela no celular fica abaixo dos 44px recomendados (a própria Topbar já foi corrigida pra 44px). Falta um `size="md"` forçado no mobile ou um mínimo de 40px.
- ACHADO (Baixa): `variant="outline"` e `variant="ghost"` têm o mesmo hover (`bg-cda-bg`), então dentro de um card cinza os dois ficam indistinguíveis no hover.
- SUGESTÃO: `loading` mantém o texto e só troca o ícone; em botão sem ícone o rótulo "Entrar" com spinner à esquerda muda a largura do botão (salto de layout).

### Badge
- ACHADO (Média): as variantes depreciadas (`green/red/amber/blue/purple/teal/pink/gray`) continuam sendo usadas em código novo — ex.: `DashboardAdministrativo` usa `badgeVariant="red"`/`"green"`, `alunos/page` usa `variant="amber"`/`"red"`, `aniversariantes` usa `variant="amber"`, `statusVisual.ts` usa `green/amber/red/gray`. O alias existe pra migração, mas enquanto o código novo usa o alias a migração nunca termina.
- ACHADO (Baixa): `MetricCard` tem `badgeVariant = "gray"` como default — um default depreciado.
- OK: separação semântico vs categórico é exemplar e bem documentada.

### Card
- OK: um único vocabulário de ênfase (borda esquerda 4px).
- ACHADO (Média): `MuralWidget` aplica `className="border-l-4 border-l-cda-amber"` à mão em vez de `emphasis="warning"` — exatamente o padrão que o `emphasis` foi criado pra substituir. Fica com cor levemente diferente do token (`--cda-amber` vs `--status-warning` são o mesmo hoje, mas divergem no dia que um mudar).
- ACHADO (Baixa): o corpo do Card não tem padding próprio; cada tela decide (`p-4`, `p-5`, `p-0`). Daí `alunos/page` usa `p-4` no card de filtro e `academico` não usa card nenhum. Um `padded` opcional resolveria.

### Table
- OK: `ThActions`/`TdActions` padronizam a coluna de ações; linha clicável focável por teclado.
- ACHADO (Alta): `Table` não tem cabeçalho fixo (`sticky`) nem coluna de nome fixa. Em Alunos (lista longa, 4 colunas largas) e em Ponto, ao rolar, perde-se a referência da coluna.
- ACHADO (Média): no celular o `overflow-x-auto` é a única estratégia responsiva — a tabela de Alunos tem uma coluna de responsáveis com `w-64` fixo, o que garante scroll horizontal em qualquer celular. Nenhuma tabela vira lista de cards no mobile.
- ACHADO (Baixa): `TableEmpty` faz `String(children)` — se alguém passar JSX no título vira "[object Object]".

### Modal
- OK: Esc fecha, scroll travado, overlay navy 40%, portal.
- ACHADO (Média): não há foco preso (focus trap) nem foco inicial no primeiro campo; abrir um modal grande no teclado deixa o foco no body atrás.
- ACHADO (Baixa): overlay não tem transição; o modal aparece com corte seco. Consistente com o resto do sistema (sem animação), então é aceitável — marcado como opcional.

### Input / Select / Combobox / FilterSelect / SearchInput
- OK: todos 40px, raio 8px, borda azul no foco, rótulo 12px medium. Combobox propositalmente idêntico ao Select em repouso.
- ACHADO (Alta): existem quatro dialetos de "escolher/filtrar" no sistema — `Select` nativo (Alunos, Aniversariantes), `FilterSelect` (Interessados), `Combobox` (modais), e formulário GET com botão "Filtrar" (Alunos, Aniversariantes) vs `SearchInput` com debounce (criado justamente pra remover o botão "Filtrar", mas as duas telas de listagem continuam com o form + botão).
- ACHADO (Média): `Input` não expõe `hint` (o `Field`/Combobox tem `hint`, o Input não) — telas que precisam de ajuda escrevem `<p>` solto abaixo.
- ACHADO (Média): os checkboxes de Alunos (`censo`, `contrato`) são `<input type="checkbox">` cru com classes soltas — não existe componente Checkbox no kit, então cada tela improvisa.
- SUGESTÃO: `SearchInput` não tem botão de limpar (x) quando preenchido.

### Toast
- OK: provider único, 3 variantes, fundo navy, auto-dismiss 3,2s.
- ACHADO (Média): `showToast` é uma função-módulo com um único slot (`pushToast`); é chamada em vários fluxos, mas várias ações de escrita ainda só fazem `router.refresh()` sem toast (ex.: `AvisoCard.alternarFixado`, `AvisoCard.excluir`, `MuralWidget`). O componente existe; a adoção é parcial.
- ACHADO (Baixa): toast fica em `bottom-6 left-1/2`, em cima do rodapé institucional; em telas curtas cobre o rodapé e o último botão do formulário.

### Alert / EmptyState / Skeleton / PaginaCarregando
- OK: `Alert` com 5 tons e um formato; `EmptyState` com ícone, título, subtítulo, ação.
- ACHADO (Média): `CensoAlerta` usa `title="Alerta importante"` — título genérico que não diz o que aconteceu; o dado real ("12 alunos com dados incompletos") fica no corpo, invertendo a hierarquia que o próprio Alert propõe.
- ACHADO (Baixa): `EmptyState` aceita `action`, mas quase nenhuma chamada passa uma (`TableEmpty` em Alunos, Mural, Aniversariantes) — o usuário vê "Nenhum X" sem caminho.
- ACHADO (Baixa): `PaginaCarregando` tem 3 variantes fixas; a de "painel" mostra 4 métricas, mas os dashboards Pedagógico/Administrativo têm 3 — o esqueleto salta ao trocar pelo conteúdo real.

### Avatar
- OK: cor determinística categórica, 4 tamanhos, fallback de iniciais.
- ACHADO (Baixa): tamanho `sm` = 28px é usado como alvo de link em tabela (Alunos) junto com o nome; o link inteiro é grande, então não é problema de toque — mas `xl` (96px) só é usado no PhotoUpload, que reimplementa o avatar à mão em vez de usar o componente (`PhotoUpload` monta seu próprio círculo com `corAvatar`/`iniciais`).

### MetricCard
- OK: tom categórico vs status bem resolvido; badge no canto; sparkline opcional.
- ACHADO (Média): o card é sempre centralizado. Numa grade de 4 no desktop funciona; em `grid-cols-2` no celular (Dashboard Admin) o valor de 24px + rótulo + subtexto + círculo de 48px empilhados deixam o card muito alto e a leitura vira scroll.
- ACHADO (Baixa): `hover:scale-[1.015]` roda mesmo quando o card NÃO é link (sem `href`) — sugere clique onde não há.

## Dashboard (4 variantes)
- OK: cada variante confere a grade de permissões de verdade; saudação com primeiro nome; relógio ao vivo acima do subtítulo.
- ACHADO (Alta): as 4 variantes não têm a mesma estrutura de grade. Admin usa `grid-cols-2 lg:grid-cols-4`, Pedagógico e Administrativo usam `sm:grid-cols-2 lg:grid-cols-3`, Genérico não tem métricas. Trocar de perfil dá a impressão de sistemas diferentes.
- ACHADO (Média): "Bem-vindo(a) de volta, Matheus!" ocupa a posição de H1 (24px bold) em todas as 4 variantes — o elemento de maior peso visual da tela é a saudação, não a informação. O `subtitle` ("Visão geral da Escola CDA — todos os setores") é que diz onde a pessoa está.
- ACHADO (Média): `DashboardAdministrativo` tem a tabela "Estoque baixo" com o vazio "Nenhum item abaixo do mínimo 🎉" — único emoji da interface inteira (o comentário do `Alert` registra que o emoji 🔑 foi removido de usuarios/page justamente por isso). Inconsistente.
- ACHADO (Baixa): `DashboardGenerico` tem só 2 widgets e nenhuma métrica — muito espaço vazio à direita no desktop; o `MuralWidget` em `lg:col-span-2` fica sozinho.
- SUGESTÃO: `AtividadeRecenteWidget` e `ProximosEventosWidget` retornam `null` quando sem permissão, o que muda silenciosamente a grade (a coluna direita esvazia). Um placeholder não é desejável, mas a grade poderia se reorganizar.

## Mural
- OK: grade de 3 colunas, aviso fixado com `emphasis="brand"`, confirmação de leitura, ConfirmDialog.
- ACHADO (Média): o card do aviso usa `whitespace-pre-wrap` sem limite de linhas — um aviso longo estica um card da grade e desalinha a linha inteira (os irmãos ficam com altura diferente). No widget do Dashboard há `line-clamp-2`; na página não há.
- ACHADO (Baixa): as três ações do card (editar/fixar/excluir) são 3 IconButtons de 32px lado a lado no canto; no celular, num card estreito, competem com o título.
- ACHADO (Baixa): não há indicação de quem já confirmou a leitura, só a contagem ("3 confirmaram") — quem gerencia não tem como saber quem falta.

## Calendário
- OK (pendente de leitura detalhada de CalendarioCompleto).

## Aniversariantes
- OK: três listas com o mesmo componente, rótulo de coluna adaptado, badge de contagem.
- ACHADO (Média): filtro é `Select` + botão "Filtrar" (form GET). Em `Interessados` o mesmo tipo de filtro é `FilterSelect` que aplica na hora. Dois padrões pra mesma tarefa.
- ACHADO (Baixa): o Alert de "Hoje é aniversário de X!" usa `tone="brand"` (amarelo) — o único uso de brand no sistema. Correto conceitualmente (é institucional/celebrativo), mas o amarelo com glifo navy é o de menor contraste da paleta.
- ACHADO (Baixa): a coluna "Completa" mostra "5 anos" sem deixar claro que é a idade que a pessoa completa NESTE ano — para quem já passou o aniversário no mês, o número é a idade atual; para quem não passou, é a futura. Sem rótulo, ambíguo.
