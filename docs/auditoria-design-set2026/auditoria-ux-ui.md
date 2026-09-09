# Auditoria de UX/UI — ERP Escola CDA

Setembro de 2026. Baseada na leitura do código em `ERP-CDA/` (componentes, telas e libs), não em capturas de tela.

## Onde o sistema já está bem

Vale registrar antes dos problemas, porque muda o tipo de recomendação que faz sentido. O ERP já passou por um handoff de design em etapas e por uma auditoria visual anterior, e isso aparece:

- **Tokens semânticos** existem e são usados (`--text-heading`, `--surface-card`, `--status-*`).
- **Badge separa estado de categoria** — a paleta categórica não tem verde nem vermelho, de propósito, para que um setor nunca seja lido como um erro. É a decisão mais madura do sistema.
- **Um único vocabulário de ênfase de card** (borda esquerda de 4px), em vez de sombras e cores concorrentes.
- **`window.confirm` foi substituído por `ConfirmDialog`**, que exige dizer a consequência da ação.
- **`loading.tsx` por rota** com esqueleto, em vez de tela branca.
- **Foco de teclado global** (`:focus-visible`) e alvo de toque de 44px na topbar.
- **`FilterSelect` com popup próprio** em vez do `<select>` nativo, cujo popup o sistema operacional desenha (quase ilegível no Android).
- **Combobox propositalmente idêntico ao Select em repouso**, para não criar um segundo dialeto de campo.

Portanto os achados abaixo são de segunda ordem: consistência entre telas equivalentes, resíduos de decisões antigas e densidade. Não há nada de estruturalmente errado.

---

## Prioridade alta

### 0. O Setor não decide nada, mas parece que decide

Este é o achado de maior consequência do sistema. Em `/usuarios/[id]` há dois controles concorrentes: um `<Select>` chamado **"Setor"** (Direção, Financeiro, Pedagógico…) e, abaixo, a grade **"Acesso por setor"** — 15 módulos × 3 níveis. Só a grade decide o acesso: sem marcação, a pessoa não vê nada, qualquer que seja o Setor. O próprio código explica isso num parágrafo dentro do card ("o Setor lá em cima é só uma etiqueta, não libera nada sozinho").

Um campo que parece atribuir permissão e não atribui é uma armadilha. O texto de apoio existe, mas está *abaixo* do controle que engana, dentro de uma seção colapsável, e o Setor continua sendo o que aparece como Badge na listagem de Usuários e no perfil — ou seja, é o que a interface exibe como identidade de acesso da pessoa.

**Recomendação:** renomear o Select para "Setor (etiqueta)" ou movê-lo para fora do bloco de acesso, e mostrar na listagem de Usuários a contagem de setores liberados ao lado do Badge de Setor. O que decide precisa ser o que se vê.

### 1. Quatro dialetos diferentes para "filtrar uma lista"

A mesma tarefa aparece de quatro formas: `<select>` nativo com botão **Filtrar** (Alunos, Funcionários, Aniversariantes, Horários), `FilterSelect` que aplica na hora (Interessados), `Combobox` (modais) e `SearchInput` com debounce — que foi criado justamente para remover o botão "Filtrar", mas as telas de listagem continuam com o formulário GET.

Quem usa Alunos e depois Interessados aprende duas mecânicas para a mesma coisa. E o botão "Filtrar" custa um clique extra em toda busca.

**Recomendação:** uma barra de filtro única para todas as listagens — busca instantânea + `FilterSelect` que aplica na hora + contador "N de M" + link "Limpar filtros". Aplicada no UI kit deste sistema (`BarraFiltro`, em `ui_kits/erp/Screens2.jsx`) para todas as telas de lista.

### 2. Tabelas longas sem cabeçalho fixo

`Table` não tem `position: sticky` no `<thead>`. Em Alunos (128 linhas, 4 colunas largas, uma delas com bloco de responsáveis) e na folha de ponto (31 linhas × 5 campos de hora), ao rolar você perde a referência de qual coluna está preenchendo. Na folha de ponto isso é risco de erro de digitação, não só desconforto.

**Recomendação:** `thead` fixo em toda tabela com mais de ~10 linhas. Aplicado no kit (`THEAD_STICKY`).

### 3. Cor de estado usada como decoração em contagens

Cinco lugares reincidem no que o próprio sistema definiu como proibido:

- **Ponto:** `Badge variant={saldo < 0 ? "red" : saldo > 0 ? "green" : "gray"}` — banco de horas positivo não é "sucesso" e negativo não é "erro"; é um número neutro. Além disso usa três variantes depreciadas.
- **Estoque:** Entradas em `tone="success"` e Saídas em `tone="warning"` — entrada e saída são categorias de movimentação, não estados.
- **Interessados:** "Em andamento" em `tone="warning"` — é etapa de funil, não problema.
- **Folha de ponto (`PontoMesForm`):** o saldo do banco de horas usa `Badge variant={saldo < 0 ? "red" : "green" : "gray"}`, e as colunas Atraso/Falta e Hora Extra usam `red`/`green` — três variantes depreciadas, e hora extra em verde ("sucesso") num contexto em que hora extra é custo.
- **Grade de permissões (`PermissoesUsuarioSecao`):** `variant="green"` para "N setores liberados" e `"red"` para "Nenhum setor liberado". A segunda é defensável (é uma condição a resolver); a primeira faz de uma contagem um elogio.

**Recomendação:** usar `variant="count"` para saldos e tons `cat*` para contagens categóricas. Tom de status só quando o número realmente reporta um estado (ex.: contratos pendentes > 0). Aplicado no kit.

### 4. Telas equivalentes com estruturas diferentes

- **Listas de pessoas:** Alunos é um Card único com tabela e abas do módulo; Funcionários é N Cards, um por setor, sem abas. Mesma tarefa — achar uma pessoa — com duas estruturas.
- **Perfis de pessoa:** a ficha do aluno é uma grade de 3 colunas em largura cheia; o perfil do funcionário é `max-w-2xl` centralizado. Além disso, no perfil do funcionário o `PageHeader` mostra o nome como H1 e o Card repete o nome como H2 logo abaixo.
- **Dashboard:** as quatro variantes por perfil usam grades diferentes (`lg:grid-cols-4` no Admin, `lg:grid-cols-3` no Pedagógico e Administrativo, nenhuma métrica no Genérico). Trocar de perfil dá a impressão de sistemas diferentes.

**Recomendação:** uma estrutura de listagem de pessoas e uma de perfil de pessoa, reaproveitadas. Grade de métricas com o mesmo número de colunas em todas as variantes do Dashboard (4 no desktop, ainda que alguma variante mostre 3 tiles).

---

### 5b. Botões coloridos à mão, fora do sistema de variantes

`ContratoSecao` tem cinco grupos de ação e resolve a hierarquia sobrescrevendo classes no `Button`: `bg-cda-green` para "Marcar como assinado", `border-cda-blue/40 text-cda-blue` para "Marcar como enviado", `border-cda-purple/40 text-cda-purple` para "Copiar link", `border-cda-amber/40 text-cda-amber` para "Gerar novamente". `GerarContratoModal` faz o mesmo. A intenção é boa e está bem comentada no código — o problema é que a necessidade existe e o `Button` não a atende, então cada tela reinventa a cor.

**Recomendação:** ou uma prop `tone` no `Button` para variantes `outline` (`tone="success" | "info" | "warning" | "danger"`), ou aceitar que essa hierarquia de cinco níveis é um caso único e movê-la para um `MenuButton` com as ações consequentes agrupadas.

### 5c. `Input` aceita `label` como JSX só para marcar obrigatório

`CensoCampos` passa `label={<>Sexo<Obrigatorio /></>}` — um componente local que renderiza um asterisco vermelho. O `Input`/`Select` já poderiam ter `required` controlando isso (o `Field` deste design system tem). Hoje cada formulário decide se marca obrigatório e como.

## Prioridade média

### 5. Variantes depreciadas de Badge em código novo

Os aliases antigos (`green`, `red`, `amber`, `blue`, `purple`, `teal`, `pink`, `gray`) continuam sendo usados em código recente: `DashboardAdministrativo`, `app/(erp)/alunos/page.tsx`, `aniversariantes`, `ponto`, e no próprio `lib/statusVisual.ts`. Pior: `MetricCard` tem `badgeVariant = "gray"` como valor padrão — um default depreciado. Enquanto o alias for aceito e usado, a migração nunca termina.

**Recomendação:** trocar os aliases pelas variantes por papel, mudar o default de `MetricCard` para `neutral` e remover os aliases.

### 6. Ênfase de card aplicada à mão

`MuralWidget` escreve `className="border-l-4 border-l-cda-amber"` em vez de usar `emphasis="warning"` — exatamente o caso que a prop foi criada para cobrir. Hoje as cores coincidem; no dia em que `--cda-amber` e `--status-warning` divergirem, a divergência aparece só ali.

### 7. Hierarquia invertida em alertas

`CensoAlerta` usa `title="Alerta importante"` — genérico, não diz o que aconteceu — e joga o dado real ("12 alunos com dados incompletos") no corpo. O `Alert` de Documentos faz o certo (contagem no título), então o padrão bom já existe no sistema.

O alerta de Documentos, por outro lado, concatena **todos** os vencidos com " · " num parágrafo de 13px; com seis documentos vira um bloco ilegível.

**Recomendação:** título = o fato com número; corpo = o detalhe; limitar listas a 2–3 itens + "e mais N"; sempre oferecer `action`.

### 8. Avisos permanentes sem saída

Boletos e Notas Fiscais mostram um alerta de três linhas sobre integração não configurada. É um aviso que vai aparecer todos os dias até alguém mexer na infraestrutura, ocupando o topo de duas telas de uso diário. Além disso, "Registro ainda não ligado" é jargão interno — a secretaria não sabe o que "registro" significa aqui.

**Recomendação:** compactar para uma linha com link "Como ligar", e permitir dispensar (guardando a dispensa por usuário).

### 9. Modal sem foco preso e sem foco inicial

`Modal` fecha no Esc e trava o scroll, mas não move o foco para dentro nem o prende. Num formulário de modal grande, quem usa teclado continua tabulando pela página atrás do overlay.

### 10. Erro de formulário longe do campo

`Input` expõe a prop `error` e **nenhuma tela usa**. A validação é `required` do HTML mais uma mensagem da API num `<p>` vermelho no fim do formulário. Num cadastro de oito campos, o erro fica longe da causa.

### 11. Toast existe, adoção é parcial

Várias ações de escrita só fazem `router.refresh()` sem retorno visível — fixar/desafixar aviso, excluir aviso, ações do MuralWidget. Sem confirmação, o usuário clica duas vezes.

### 12. Densidade no celular

O `overflow-x-auto` é a única estratégia responsiva das tabelas, e a coluna de responsáveis em Alunos tem largura fixa de `w-64`, o que garante scroll horizontal em qualquer celular. Nenhuma tabela se transforma em lista de cards. E o `MetricCard` é sempre centralizado: em duas colunas no celular, círculo de 48px + valor de 24px + rótulo + subtexto empilhados deixam o card muito alto.

**Recomendação:** variante de linha (ícone à esquerda, valor e rótulo à direita) para o MetricCard no mobile; tabelas de pessoas viram lista de cards abaixo de 640px.

### 13. Ações sensíveis com peso de ação comum

"Baixar backup" fica lado a lado com "Novo usuário" no cabeçalho de Usuários, com peso de ação secundária, e é visível para quem só tem permissão de leitura (só o "Novo usuário" é protegido por `podeEditar`). É a ação mais sensível do sistema.

### 14. Cores repetidas onde a cor é o diferenciador

No Log de Atividades, `Boleto` e `Aluno` compartilham `cat1`; `ListaEspera`, `Interessado` e `Funcionario` compartilham `cat5`. Numa tela cuja função é distinguir tipos por cor, três tipos com a mesma cor anulam o recurso. E o Log é a única listagem do sistema que não usa `Table` — então não herda hover, foco de teclado nem alinhamento de coluna.

Em Interessados, onze status é mais do que a paleta distingue (~9 tons legíveis). Sugestão: agrupar visualmente por fase (ação necessária / encerrado / matriculado) e deixar o texto fazer a diferenciação fina.

---

## Prioridade baixa

- **Vocabulário de card fora do padrão:** o estado vazio de Horários da Equipe usa `rounded-xl border-dashed`, que não existe em nenhum outro lugar; o `EmptyState` do kit não foi usado.
- **Emoji residual em texto de sistema:** "Nenhum item abaixo do mínimo 🎉" no Dashboard Administrativo — mesma frase que em Estoque, mas com emoji. A decisão registrada é não usar emoji na interface; o seletor de emoji do chat é outra coisa (conteúdo escrito por pessoas) e está correto.
- **Data com `capitalize`:** `RelogioAtual` aplica `text-transform: capitalize` na saída de `toLocaleDateString`, o que produz "Segunda-Feira, 7 De Setembro De 2026". Em português só a inicial deve subir. Corrigido na versão deste design system.
- **Portal de assinatura fora do sistema de componentes:** `app/assinar/[token]` monta o card, o cabeçalho e o rodapé com classes soltas, e o `AssinarContratoForm` desenha o próprio botão de download como `<a>` estilizado à mão em vez de usar `Button`. É a única tela que um cliente da escola vê — vale ser a mais consistente, não a menos.
- **`EmptyState` sem caminho:** aceita `action` e quase nenhuma chamada passa uma. O usuário vê "Nenhum X" e não sabe o que fazer.
- **Ações de cabeçalho sem wrapper flex:** Chaves, Interessados e Boletos passam `<>...</>` como `action`, deixando os botões colados; as outras telas usam `flex gap-2`.
- **Dois tamanhos para "Ver todos":** 12px em Estoque (`<button>` com classe de link), 14px no Dashboard (`<Link>`).
- **Redundância de caminho no Ponto:** o nome é link para a folha e o botão "Lançar ponto" vai para o mesmo lugar; o botão ocupa a coluna mais valiosa em tela estreita. E o cabeçalho da coluna de ações é `<Th>{""}</Th>` em vez de `<ThActions />`.
- **Cabeçalho que muda de largura:** "Lançamentos em Setembro" desloca as colunas seguintes quando o mês muda.
- **Aviso de aniversário:** "Completa 5 anos" não deixa claro se é a idade atual ou a que a pessoa completa no mês — ambíguo para quem já passou da data.
- **Confirmação de leitura sem lista:** o mural mostra "3 confirmaram", mas quem gerencia não tem como saber quem falta.
- **Card do mural sem limite de linhas:** `whitespace-pre-wrap` sem `line-clamp` na página (o widget do Dashboard tem `line-clamp-2`); um aviso longo estica um card e desalinha a linha da grade.
- **Paginação mínima no Log:** só "Anterior/Próxima", sem primeira/última nem salto de página.
- **`TableEmpty` faz `String(children)`:** JSX no título viraria "[object Object]".
- **Esqueleto que salta:** `PaginaCarregando` variante "painel" mostra 4 métricas, mas os dashboards Pedagógico e Administrativo têm 3.
- **`MetricCard` levanta no hover mesmo sem `href`,** sugerindo clique onde não há.
- **Detalhe da turma com cards de métrica improvisados:** `academico/turmas/[id]` declara `grid-cols-2 sm:grid-cols-4` mas só preenche 2 células, deixando metade da linha vazia; e os dois cards são `<Card>` com `<p>` solto em vez de `MetricCard`.
- **`TableEmpty` com duas assinaturas:** a tabela do detalhe da turma chama `<TableEmpty colSpan={1}>texto</TableEmpty>` (children), enquanto o resto do sistema usa `title=`. As duas funcionam, o que é como a divergência sobrevive.
- **Prévia do contrato ocupa metade de um modal de 6xl:** o `GerarContratoModal` tem 12 campos à esquerda e 27 cláusulas fixas à direita, num modal quase da largura da tela. As cláusulas não são editáveis — poderiam colapsar por padrão, com "Ver as 27 cláusulas".
- **Ponto: dois modos, um botão de salvar:** o toggle "Por dia"/"Grade completa" fica solto entre o card de filtros e a tabela, sem rótulo, e o botão Salvar fica no rodapé fora de qualquer card. Quem lança um dia não tem certeza se o que digitou já foi salvo.
- **Chat guarda pilha de correções documentadas no próprio código:** o clique duplo por causa do `replaceState`, o `opacity-0` que ocupava espaço no layout, o `justify-start` sob `flex-row-reverse`, o `touch-manipulation` na lista. Nada a corrigir — vale registrar que o Chat é a tela com mais dívida de layout resolvida na unha, e que mexer nela pede cuidado.
- **`PhotoUpload` reimplementa o avatar** à mão com `corAvatar`/`iniciais` em vez de usar `Avatar size="xl"`.
- **Hover igual em `outline` e `ghost`:** ambos usam `bg-cda-bg`; dentro de um card cinza ficam indistinguíveis no hover.
- **`loading` muda a largura do botão:** em botão sem ícone, o spinner some/aparece à esquerda do rótulo e o botão salta.

---

## O que já está aplicado neste design system

O UI kit em `ui_kits/erp/` não é uma cópia literal do ERP: ele reproduz o design existente e incorpora as correções de prioridade alta, para servir de referência do estado desejado.

| Achado | Como foi resolvido no kit |
| --- | --- |
| 1 — quatro dialetos de filtro | `BarraFiltro` única em todas as listagens |
| 2 — cabeçalho de tabela | `THEAD_STICKY` em todas as tabelas longas |
| 3 — cor de estado decorativa | `variant="count"` em saldos, tons `cat*` em contagens |
| 4 — estruturas divergentes | Uma estrutura de listagem e uma de perfil; grade de 4 métricas |
| 5 — variantes depreciadas | O `Badge` deste sistema só tem variantes por papel |
| 6 — ênfase à mão | `emphasis="warning"` no widget do mural |
| 7 — hierarquia de alerta | Contagem no título em todos os alertas; listas limitadas a 2 + "e mais N" |
| 11 — toast | Fluxo de lançar boleto emite toast de confirmação |
| Vazio sem caminho | Todo `TableEmpty` tem "Limpar filtros" |
| `ThActions` | Coluna de ações sempre com `ThActions`/`TdActions` |
| Emoji residual | Nenhum emoji em nenhuma tela |
| Ações de cabeçalho | `PageHeader` aplica `flex gap-8px` no `action` |
| "Baixar backup" | Rebaixado para `variant="ghost"` |
| Alerta de senha | Ganhou filtro "Ver só os pedidos" |
| Exclusão de funcionário | `ConfirmDialog` com `secondaryAction` "Só desativar" |
| Card do mural | `line-clamp: 4` para a grade não desalinhar |
| Saudação como H1 | O H1 passou a dizer onde você está; a saudação virou linha de apoio |
| Pílula azul de nav ativa | Filete amarelo + fundo sutil — a cor de ação parou de marcar estado |
| Ícone maior que o número | `MetricCard` invertido: rótulo pequeno em cima, valor de 34px embaixo |
| Botões coloridos à mão | `Button` ganhou `tone`; `ContratoSecao` parou de sobrescrever classe |
| Topbar com metade vazia | Indicador de ano letivo à esquerda |
| 12 — densidade no celular | `ListaPessoas`: cartões abaixo de 720px em Alunos, Funcionários, Interessados e Ponto |
| 9 — modal sem foco preso | Foco entra no 1º campo, fica preso e volta ao gatilho |
| 11 — toast parcial | Publicar/excluir aviso e criar usuário passaram a confirmar |
| 10 — erro longe do campo | Cadastro de aluno valida por campo, com resumo no topo |
| 8 — avisos permanentes | Alertas de integração compactados e dispensáveis |
| 7 — alerta concatenado | Documentos vencidos viram lista com "e mais N" |
| Paginação mínima | Log ganhou primeira/última e salto direto de página |
| Confirmação sem lista | Mural mostra quem confirmou e quem falta, com barra de progresso |
| Vazio sem caminho | Chaves e Horários usam `EmptyState` com ação, sem card tracejado |
| Boletos: tom de alarme | "Em aberto" só fica vermelho quando existe vencido |
| Grades de 3 colunas fixas | `auto-fill` em mural, turmas, chaves e usuários |
| Título espremido no card | Título em linha própria; ações no rodapé ou em `MenuButton` |
| Card órfão na linha de métricas | `GradeMetricas` snapa em divisores da contagem (4 → 4/2×2/1) |
