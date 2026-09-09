# Recomendação — dois achados, dois caminhos

Documento de decisão. Cada seção tem: qual padrão vence e por quê, como cada tela fica, e o que se perde.

---

# 1. Filtro: Alunos vs Interessados

## O que existe hoje

**Alunos** — formulário GET. Você escolhe a turma no `<Select>`, digita o nome, clica **Filtrar**, a página recarrega. O filtro vive na URL (`?busca=&turma=`) e o servidor devolve só as linhas que batem.

**Interessados** — `FilterSelect` com popup próprio. Você clica no status, a lista muda na hora. Nada recarrega. Todas as linhas já estão na memória do navegador e um `useMemo` filtra.

## Nenhum dos dois deveria virar o padrão

Os dois estão certos pela metade, e cada um erra no que o outro acerta.

O padrão de Alunos erra na **interação**: o botão "Filtrar" cobra um clique a mais em toda busca e faz a tela piscar. Para quem passa o dia procurando aluno na secretaria, isso é um pedágio pago dezenas de vezes por dia. E o pior: o `SearchInput` com debounce foi escrito exatamente para matar esse botão, está no repositório, e a tela de Alunos não o usa.

O padrão de Interessados erra na **escala**. Ele funciona porque o funil tem algo entre 20 e 60 famílias ativas — cabe todo na memória. Alunos não é isso. São 128 hoje, e cresce todo ano letivo sem nunca diminuir, porque matrícula trancada, cancelada e transferida continua sendo histórico que a secretaria precisa achar. Em três anos são 400+ linhas; em cinco, 600+. Carregar tudo isso no navegador para filtrar no cliente é jogar 600 fichas completas (com responsáveis, telefones, censo) pela rede para mostrar 12.

**O caminho certo é o terceiro: a interação de Interessados sobre a arquitetura de Alunos.** Filtro instantâneo, sem botão, sem recarregar visivelmente — mas com o servidor continuando a devolver só o que interessa.

Na prática isso significa: a URL segue sendo a fonte da verdade (`?busca=&turma=&situacao=`), o campo de busca faz debounce de ~300ms e reescreve a URL, e a lista se atualiza sem o usuário pedir. Do ponto de vista de quem usa, é idêntico a Interessados. Do ponto de vista de dados, é o mesmo que Alunos faz hoje.

**Onde a implementação pode continuar diferente:** Interessados pode seguir filtrando no cliente. O funil é um conjunto pequeno e limitado, e a tabela de Interessados depende de ter tudo em memória para trocar o status de uma linha na hora. Forçar Interessados a virar server-side só para "ficar igual" adicionaria 200–400ms a uma interação que hoje é instantânea, e não devolveria nada em troca.

O que **não pode** continuar diferente é o que o usuário vê. Mesma barra, mesmos controles, mesmo comportamento. A arquitetura pode divergir; a interface não.

## Como cada tela fica

**A barra de filtro única** (uma linha, acima da tabela, dentro do respiro de 16px):

- **Campo de busca à esquerda**, 260px, ícone de lupa dentro da borda esquerda, placeholder dizendo o que se busca ("Buscar nome, CPF ou responsável..."). Filtra enquanto digita, debounce de 300ms. Ganha um **X para limpar** quando tem texto.
- **Filtros à direita da busca**, um `FilterSelect` por dimensão, 200px cada, aplicando no clique. Popup ancorado pela borda direita, rótulos quebrando linha em vez de truncar.
- **Link "Limpar filtros"** aparece só quando existe algum filtro ativo. Texto de 12px, sublinhado, em `--text-muted`.
- **Contador no canto direito da linha**, 12px `--text-muted`: **"12 de 128"**. Não "12 resultados" — o usuário precisa saber de quantos, senão não sabe se o filtro pegou pouco porque filtrou bem ou porque o cadastro está vazio.

**Alunos** — sai o `<form>` GET e o botão "Filtrar". Entra a barra. Campos: busca (nome, CPF, responsável) + `FilterSelect` de turma + `FilterSelect` de situação da matrícula (Ativa / Trancada / Cancelada / Transferida / Concluída, hoje inexistente e necessária, porque é isso que separa aluno atual de histórico). O subtítulo do `PageHeader` deixa de repetir a contagem — ela virou o contador da barra. O estado vazio da tabela ganha botão "Limpar filtros".

**Interessados** — a `FilterSelect` de status e a de turma já estão certas; só entram na barra padrão, ganham o campo de busca (hoje inexistente: não dá para procurar uma família pelo nome) e o contador "N de M". Nada muda no motor.

**Funcionários, Aniversariantes, Horários, Ponto, Cardápio, Log** — todas trocam `<Select>` + "Filtrar" pela mesma barra. São seis telas que hoje têm o pedágio do botão.

## O que se perde

**Interessados perde a possibilidade de filtrar offline.** Hoje, com a página carregada, os filtros funcionam mesmo com a rede caindo. Se um dia migrar para server-side, isso vai embora. Por isso a recomendação é *não* migrar Interessados — mas registrando que a diferença de motor existe e que quem mexer nas duas telas depois vai encontrar dois códigos diferentes por baixo de duas telas idênticas. Isso precisa de um comentário no código, senão parece descuido.

**Alunos perde o "estado congelado".** Com o botão "Filtrar", a lista só muda quando você manda. Sem ele, ela muda enquanto você digita — e se você digitar devagar, vê resultados intermediários passando. Para quem digita nome inteiro, é ruído. Mitigação: o debounce de 300ms já absorve a maior parte; e um indicador discreto de "buscando" no campo evita a sensação de tela instável.

**Alunos perde o link compartilhável explícito.** Hoje, clicar em "Filtrar" produz uma URL que a pessoa pode copiar e mandar. Com debounce, a URL também se atualiza, então isso na verdade se mantém — mas o histórico do navegador fica poluído se cada tecla empurrar um estado. Precisa usar `replace` e não `push` no histórico.

**Ninguém perde o filtro por turma nem a busca por responsável.** Ambos continuam, e a busca por responsável (que hoje já existe em Alunos e não existe em Interessados) passa a existir nas duas.

---

# 2. Estrutura: listagem e ficha de Alunos vs Funcionários

## O que existe hoje

**Listagem de Alunos** — um Card, uma tabela, colunas Aluno / Turma / Nascimento / Responsáveis, abas do módulo por cima (Turmas | Alunos).

**Listagem de Funcionários** — um Card por setor. Dez setores, dez cabeçalhos, dez tabelas. Sem abas.

**Ficha de Aluno** — largura cheia, grade de duas colunas: à esquerda identidade, censo e contrato; à direita responsáveis e autorizados a buscar.

**Ficha de Funcionário** — `max-w-2xl` centralizado, uma coluna, lista de "Rótulo: valor", sem foto, e o nome repetido como H2 logo abaixo do H1 do cabeçalho.

## Listagem: o padrão de Alunos vence

A tarefa dominante nas duas telas é a mesma: **achar uma pessoa**. Para isso, uma lista única ganha de dez listas, porque você varre um lugar em vez de decidir primeiro em qual setor a pessoa está. E o agrupamento por setor cobra caro: dez cabeçalhos de Card ocupam altura de tela que não carrega informação nenhuma, e quando o filtro corta o resultado para três pessoas de setores diferentes, você fica com três Cards de uma linha cada.

O agrupamento por setor serve uma tarefa diferente e legítima: **ver a escola como organização** — quem está em Nutrição, quantas pessoas tem no Pedagógico. Mas essa tarefa é melhor servida pelo *filtro* do que pela *estrutura*: filtrar por Nutrição devolve exatamente o grupo, e o setor continua sendo uma coluna com Badge para quem só quer bater o olho.

## Listagem: como fica

**Funcionários** passa a ser um Card e uma tabela, com a barra de filtro do item 1 por cima.

Colunas: **Nome** (avatar 28px + nome, com o badge de pendência de cadastro embaixo quando houver) · **Cargo** · **Setor** (Badge categórico) · **Telefone** · **Admissão** · coluna de ações (editar, excluir).

O que muda em relação a hoje:
- Somem os dez cabeçalhos de Card e as dez tabelas.
- O setor vira coluna + filtro.
- O badge de pendência para de mostrar a frase inteira. Hoje, com uma pendência só, ele estampa "Sem jornada prevista definida — o Ponto não vai calcular horas extra/atraso corretamente" dentro de uma pílula de 90 caracteres, que quebra a linha e deixa de parecer badge. Passa a mostrar **"1 pendência"** / **"3 pendências"**, com as frases completas no `title`.
- O estado vazio ganha "Limpar filtros" (hoje diz "Nenhum funcionário encontrado." e não oferece saída).

**Para recuperar a visão de organização** sem trazer os dez Cards de volta: as opções do `FilterSelect` de setor levam a contagem no rótulo — "Pedagógico (5)", "Nutrição (1)", "Serviços Gerais (2)". Abrir o filtro passa a ser a visão de headcount, e um clique já isola o grupo.

## Ficha: o padrão de Alunos vence

A ficha de funcionário está em `max-w-2xl` porque nasceu com seis campos. Hoje tem identidade, seis campos de cadastro, documentos anexados e situação no ponto — e vai crescer. Uma coluna centralizada obriga a rolar por algo que caberia em duas.

## Ficha: como fica, campo por campo

**Cabeçalho** — `PageHeader` com o nome como H1, subtítulo `cargo · setor`, breadcrumb Funcionários › Nome, ação "Editar cadastro" à direita. **O H2 duplicado do nome sai** — hoje o nome aparece duas vezes em 60px de distância.

**Coluna principal (2fr)**

*Card de identidade* — `PhotoUpload` de 96px à esquerda (hoje não existe foto de funcionário, e o componente já está pronto; a ficha do aluno usa). À direita, Badge do setor + cargo em texto, e abaixo uma grade de duas colunas com rótulo alinhado:

| Campo | Hoje | Depois |
| --- | --- | --- |
| CPF | "Não informado" | oculto quando vazio |
| Admissão | 12/01/2019 | igual |
| Nascimento | "Não informado" | oculto quando vazio |
| Telefone | "Não informado" | oculto quando vazio |
| E-mail | "Não informado" | oculto quando vazio |
| Jornada prevista | "Não definida" | **fica visível mesmo vazia** — é o que trava o cálculo do ponto |

E, no lugar dos vazios, **uma linha só**: "4 campos não informados" com link "Completar cadastro". Hoje, cinco "Não informado" enfileirados dão a impressão de cadastro abandonado quando na verdade faltam dados opcionais.

*Card de documentos* — como está hoje (linha com ícone, nome do arquivo, data de anexo, abrir e remover). Só troca o botão "Anexar arquivo" pelo `FileUpload`, que mostra o nome escolhido antes de salvar.

**Coluna lateral (1fr)**

*Card "Ponto"* — participa do ponto (Sim/Não), jornada prevista, saldo acumulado, botão "Ver lançamentos". Hoje essa informação está espalhada entre a ficha e a tela de Ponto.

*Card "Acesso ao sistema"* — se a pessoa tem usuário: Badge do perfil, quantos setores liberados, link para o perfil dela em Usuários. Se não tem: "Sem acesso ao sistema" e botão "Criar usuário". Hoje não há nenhuma ponte entre Funcionário e Usuário, e são a mesma pessoa em duas telas.

**A ficha de Aluno não muda** — ela já é o padrão. Só ganha coerência de rótulo: o card hoje chamado "Pessoas autorizadas" passa a "Autorizados a buscar", que é o nome usado na Ficha de Matrícula impressa e o que a secretaria fala.

## O que se perde

**Perde-se a leitura confortável do `max-w-2xl`.** Num monitor largo, seis campos em duas colunas dentro de 1360px ficam com muito ar entre rótulo e valor. Mitigação: a grade da identidade não estica até a borda — ela vive dentro da coluna de 2fr e o Card tem largura máxima interna. Não é o texto que ocupa 1360px, é o layout.

**Perde-se o headcount por setor visível sem clique.** Hoje você abre Funcionários e vê "Pedagógico 5", "Cozinha 1", "Secretaria 1" empilhados, de graça. Depois da unificação, isso está dentro do filtro. Para quem monta escala e precisa desse número todo dia, é um clique novo. Se isso doer na prática, o caminho é uma faixa compacta de chips acima da tabela ("Pedagógico 5 · Cozinha 1 · Secretaria 1"), clicáveis, que filtram — não voltar aos dez Cards.

**Perde-se a separação visual entre setores na varredura.** Numa tabela única de 27 linhas ordenada por nome, pessoas do mesmo setor ficam espalhadas. Mitigação: ordenação padrão por setor e depois por nome, com o Badge de setor na coluna — a vizinhança se mantém sem cabeçalhos.

**Perde-se a rota `/academico/turmas` como listagem própria** — mas isso já aconteceu: ela hoje é um `redirect` para Acadêmico. Só vale registrar que as abas Turmas | Alunos do módulo Acadêmico continuam, e que Funcionários **não** ganha abas, porque não tem um par (não existe "Setores" como tela).

---

# Ordem sugerida

1. **Barra de filtro única** — resolve seis telas, é o de maior retorno por esforço e não muda nenhum dado.
2. **Listagem de Funcionários** — depende da barra existir.
3. **Ficha de Funcionário** — independente, pode ir em paralelo.
~~4. Filtro de situação da matrícula em Alunos~~ — **descartado pelo dono do sistema.**

Eu havia recomendado um filtro de situação (Ativa / Trancada / Cancelada / Transferida / Concluída) na listagem de Alunos, partindo da leitura de que a tela mostrava todo mundo e faltava separar aluno atual de histórico.

**A leitura estava errada.** O servidor já filtra `situacao: "ATIVA"` na consulta — a listagem nunca mostrou histórico, e isso é intencional: a tela responde "quem está na escola hoje", e ponto. Expor as outras situações ali seria trazer para a tela de uso diário um dado que ninguém pediu.

Os recortes que a tela realmente oferece, e que valem manter na barra de filtro unificada, são os dois checkboxes existentes: **"Só alunos com dados incompletos pro censo"** e **"Só alunos com contrato aguardando assinatura"**. Os dois viram checkboxes na própria barra, ao lado do filtro de turma, aplicando na hora — em vez de campos de um formulário que só valem depois do botão "Filtrar".
