---
name: No Excuses
description: Sem desculpas. Hábitos e tarefas com prazo calculado a partir da hora de dormir.
colors:
  bg: "#F2F4F7"
  surface: "#FFFFFF"
  raised: "#E9EDF2"
  text: "#16181D"
  muted: "#5B6472"
  line: "#E1E6EC"
  line-strong: "#C9D1DB"
  primary: "#15803D"
  primary-edge: "#0E5F2D"
  primary-ink: "#15803D"
  primary-soft: "#E3F4E8"
  partial-ink: "#0E5F2D"
  on-primary: "#FFFFFF"
  done: "#16A34A"
  flame: "#EA580C"
  flame-ink: "#C2410C"
  flame-soft: "#FFEDDB"
  xp: "#EAB308"
  xp-ink: "#A16207"
  xp-soft: "#FEF3C7"
  attention: "#F59E0B"
  attention-ink: "#B45309"
  attention-soft: "#FEF3E2"
  urgent: "#EF4444"
  urgent-ink: "#C81E1E"
  urgent-soft: "#FDECEC"
  overdue: "#B91C1C"
  overdue-ink: "#991B1B"
  toast-bg: "#16181D"
  toast-text: "#F4F6F8"
  t-study: "#E1ECFF"
  t-reading: "#DDF4E4"
  t-exercise: "#FFE7D4"
  t-health: "#DBF2F8"
  t-mind: "#ECE5FF"
  t-work: "#E6EAF0"
  t-home: "#FFF0C9"
  t-finance: "#E7F4D6"
  t-social: "#FFE2EA"
  t-creative: "#FBE3F4"
  t-none: "#ECEFF3"
typography:
  display:
    fontFamily: "Nunito Variable, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(2.5rem, 11vw, 3.25rem)"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Nunito Variable, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  headline-moment:
    fontFamily: "Nunito Variable, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 900
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Nunito Variable, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  item:
    fontFamily: "Nunito Variable, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 800
    lineHeight: 1.25
  body:
    fontFamily: "Nunito Variable, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.45
  label:
    fontFamily: "Nunito Variable, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 700
  meta:
    fontFamily: "Nunito Variable, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
  numeral:
    fontFamily: "Nunito Variable, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 900
    lineHeight: 1.1
    fontFeature: "tnum"
rounded:
  cell: "10px"
  icon: "12px"
  control: "14px"
  inner: "16px"
  option: "18px"
  row: "20px"
  card: "22px"
  sheet: "26px"
  pill: "99px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "14px"
  lg: "18px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.item}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "48px"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "48px"
  button-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.urgent-ink}"
    rounded: "{rounded.control}"
    height: "48px"
  button-text:
    textColor: "{colors.primary-ink}"
    padding: "0 4px"
    height: "44px"
  icon-button:
    textColor: "{colors.muted}"
    rounded: "{rounded.icon}"
    size: "44px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  chip-on:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-ink}"
  option:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.option}"
    padding: "12px 14px"
    height: "84px"
  option-on:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-ink}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
    height: "52px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "18px"
  task-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.item}"
    rounded: "{rounded.row}"
    height: "72px"
  check:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.done}"
    size: "52px"
  check-done:
    backgroundColor: "{colors.done}"
    textColor: "{colors.on-primary}"
  tile:
    backgroundColor: "{colors.t-none}"
    rounded: "{rounded.control}"
    size: "46px"
  pill-flame:
    backgroundColor: "{colors.flame-soft}"
    textColor: "{colors.flame-ink}"
    rounded: "{rounded.pill}"
    padding: "6px 11px 6px 8px"
  pill-xp:
    backgroundColor: "{colors.xp-soft}"
    textColor: "{colors.xp-ink}"
    rounded: "{rounded.pill}"
    padding: "6px 11px 6px 8px"
  nav-tab:
    textColor: "{colors.muted}"
    height: "64px"
  nav-tab-on:
    textColor: "{colors.primary-ink}"
  nav-add:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.inner}"
    width: "56px"
    height: "48px"
  sheet:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.sheet}"
    padding: "10px 18px 20px"
  toast:
    backgroundColor: "{colors.toast-bg}"
    textColor: "{colors.toast-text}"
    rounded: "{rounded.inner}"
---

# Design System: No Excuses

## Overview

**Creative North Star: "A Lista a Um Toque"**

O padrão dos apps de hábito executado com capricho. Uma lista calma de linhas brancas sobre fundo cinza-azulado claro, tinta quase preta, e cada item a um toque de feito. A régua de acabamento é Duolingo e Todoist: formas gordas e arredondadas, Nunito em pesos fortes, botões que afundam ao tocar e progresso que se sente (anel do dia, sequência, XP, a tela de dia fechado).

A densidade é de app de celular: uma coluna de até 560 px, linhas de 72 px de altura, alvos de toque de 44 px ou mais em todo controle. A cor é rara e sempre quer dizer alguma coisa: verde é ação e feito, laranja é sequência, dourado é XP, âmbar e vermelho são prazo apertando. O resto é neutro. O movimento é rápido e assentado (`--ease`); o elástico (`--spring`) aparece só em dois momentos de recompensa.

A variante escura segue o sistema operacional (`prefers-color-scheme`) e troca neutros, tintas e fundos suaves, mantendo os papéis.

**Key Characteristics:**
- Fundo claro com linhas e cards brancos de sombra mínima; nada de painel escuro com bordas pesadas.
- Um único verde de ação; as outras cores são semânticas e confinadas ao seu papel.
- Botões, fichas e opções com borda inferior mais grossa que afunda no `:active`.
- Quadradinhos arredondados tingidos pela categoria guardam o emoji do item.
- Ícones de traço desenhados à mão (24x24, `stroke-width` 2, pontas redondas), nunca glifos de texto.
- Números em `tabular-nums` e peso 900.

## Colors

Neutros frios e calmos com uma cor de ação e quatro cores semânticas, cada uma presa a um papel.

### Primary
- **Verde de Ação** (`primary`, com borda `primary-edge`): fundo de todo botão principal, do + da barra de abas, da marca e do herói do login no desktop. Branco (`on-primary`) sobre ele passa de 4.5:1. É o mesmo nos dois temas.
- **Tinta Verde** (`primary-ink`): texto e ícone na cor de ação (aba ativa, botão de texto, ficha e opção selecionadas, anel de foco, cursor). No escuro clareia para #4ADE80.
- **Verde Suave** (`primary-soft`): fundo do estado selecionado (ficha, opção, aba, card de configuração inicial) e do dia parcial no calendário.
- **Verde Feito** (`done`): o que está concluído: disco do círculo de concluir, anel do dia, barra do passo, interruptor ligado, barras do gráfico.

### Secondary
- **Laranja Chama** (`flame`, `flame-ink`, `flame-soft`): só a sequência. Pílula de sequência no topo, bolinhas dos dias fechados da semana, medalha e linha de sequência da tela Dia fechado, ficha de sequência no resumo do histórico.

### Tertiary
- **Dourado XP** (`xp`, `xp-ink`, `xp-soft`): só pontos e nível. Pílula de nível, o "+10 XP" que sobe da linha, barra de nível, KPI de XP. A estrela de item essencial também usa `xp`.

### Urgência
- **Âmbar Atenção** (`attention`, `attention-ink`, `attention-soft`): linha de prazo de item que está chegando perto.
- **Vermelho Urgente** (`urgent`, `urgent-ink`, `urgent-soft`): prazo estourando, aviso de déficit no card do dia, erro de texto, botão de perigo, dia sem nada no calendário. Item urgente ganha contorno interno vermelho a 55%.
- **Vermelho Atrasado** (`overdue`, `overdue-ink`): item já atrasado (fundo tingido de `urgent-soft`) e o toast de erro.

### Tintas de categoria
- **Tintas de quadradinho** (`t-study` até `t-creative`, e `t-none`): onze fundos pastel (no escuro, tons profundos) que só aparecem atrás do emoji do item.

### Neutral
- **Fundo** (`bg`): a tela inteira; também o fundo dos KPIs dentro de cards.
- **Superfície** (`surface`): cards, linhas, folhas, campos, botões fantasma.
- **Elevado** (`raised`): trilhos de barra e anel, dias vazios, esqueleto de carregamento, toque em linhas.
- **Tinta** (`text`) e **Tinta Calma** (`muted`): texto principal e secundário (datas, contagens, metas, ícones de apoio).
- **Linha** (`line`) e **Linha Firme** (`line-strong`): bordas de 2 px dos controles e divisórias; `line-strong` no hover e nos segmentos por fazer.
- **Toast** (`toast-bg`, `toast-text`): invertido; quase preto no claro, quase branco no escuro.

Escuro (sobrescreve no mesmo nome): `bg` #0F1216, `surface` #181C22, `raised` #232831, `text` #ECEFF3, `muted` #A0A9B6, `line` #2A3039, `line-strong` #3A424D; tintas clareiam (`flame-ink` #FB923C, `xp-ink` #FACC15, `attention-ink` #FBBF24, `urgent-ink` #F87171, `overdue-ink` #FCA5A5) e os fundos suaves escurecem.

### Named Rules
**The One Green Rule.** Existe um verde de ação. Todo botão principal, seleção e conclusão usa a família `primary`/`done`; nenhuma outra cor vira botão.

**The Colour Has A Job Rule.** Laranja só na sequência, dourado só no XP, âmbar e vermelho só no prazo e no erro, tintas de categoria só no quadradinho do item. Se uma cor aparece fora do seu papel, ela mente.

**The Ink-On-Soft Rule.** Texto sobre fundo suave usa o par `-ink` da mesma família, nunca a cor cheia; quando o `-ink` não passa de 4.5:1 sobre o suave, cria-se um token de contraste próprio, como `partial-ink` (#0E5F2D no claro) para o numeral do dia parcial sobre `primary-soft`.

## Typography

**Display Font:** Nunito Variable (com system-ui, -apple-system, Segoe UI, Roboto, sans-serif)
**Body Font:** Nunito Variable (mesma família)

**Character:** Uma só família arredondada, auto-hospedada via `@fontsource-variable/nunito`, usada em pesos fortes: 500 para texto corrido, 700 para apoio, 800 para títulos e controles, 900 para números e momentos.

### Hierarchy
- **Display** (900, clamp(2.5rem, 11vw, 3.25rem), 1; até clamp(3.5rem, 6vw, 5.5rem) no login de desktop): só o herói do login e o relógio grande.
- **Headline** (800, 1.875rem, 1.1; 2.25rem a partir de 1024 px): título de cada tela.
- **Headline de momento** (900, 1.625rem a 2rem): pergunta de cada passo do cadastro e título de "Dia fechado".
- **Title** (800, 1.25rem, 1.2): títulos de card e grupo; seções de lista em 1.0625rem 800 com contagem `muted` ao lado.
- **Item** (800, 1.0625rem, 1.25): nome do item na linha e texto de opção grande.
- **Body** (500, 1rem, 1.45): texto corrido; campos em 600.
- **Label** (700, 0.9375rem): rótulos de campo, data do topo.
- **Meta** (700, 0.875rem, `muted`): linha de prazo, subtítulos; 0.8125rem para legendas e rótulos de KPI.
- **Numeral** (900, `tabular-nums`): anel do dia, KPIs, contador do passo (2rem), relógio do foco.

Títulos levam `letter-spacing: -0.015em` e `text-wrap: balance`. Botões: 800, 1rem, `letter-spacing: 0.005em`.

### Named Rules
**The Heavy Rounded Rule.** Hierarquia por peso e tamanho dentro de Nunito; nada abaixo de 500, nenhuma segunda família, nada em caixa alta.

**The Tabular Count Rule.** Todo número que muda (contagens, tempos, XP, percentuais) usa `tabular-nums` para não dançar.

## Layout

Celular primeiro. `main` tem no máximo 560 px, 16 px de margem lateral e folga embaixo de 104 px mais `safe-area-inset-bottom` para a barra de abas. Todo elemento fixo respeita as `env(safe-area-inset-*)`.

- **A partir de 700 px:** `main` vai a 720 px com 24 px de margem; grades de itens e gráficos em 2 colunas; a folha vira diálogo centralizado (até 520 px; o cadastro em passos até 560x780).
- **A partir de 1024 px:** a barra de abas vira barra lateral fixa de 248 px com a marca no topo e "Novo item" como primeiro botão; `main` vai a 1160 px com 40/48 px de respiro; telas com `split` ganham coluna lateral fixa de 360 px; grade de hábitos em 3 colunas.
- **A partir de 1440 px:** 64 px de margem lateral e 4 colunas de hábitos.
- **Login a partir de 900 px:** duas metades; a esquerda é o herói verde com o relógio, a direita o formulário.

Ritmo: espaços pequenos de 6, 8 e 10 px entre irmãos, 14 e 18 px de recheio, 24 px de margem de diálogo; seções separadas por 26 px acima e 10 px abaixo.

### Named Rules
**The Thumb Floor Rule.** Nenhum alvo de toque abaixo de 44 px: botões 48, campos 52, círculo de concluir 52, abas 64, linhas de item 72, opções de passo 84, botões de rodapé 54.

**The Right Edge Is Done Rule.** O círculo de concluir mora na borda direita de cada linha; nada flutua por cima dele. Por isso o + fica no centro da barra de abas, nunca como botão flutuante no canto.

## Elevation & Depth

Quase plano. Cards e linhas brancas se separam do fundo cinza por uma sombra ambiente quase invisível; profundidade real só para o que se sobrepõe à tela (folha, toast, dica de gráfico). A sensação de volume vem da borda inferior dos controles, não de sombra.

### Shadow Vocabulary
- **Repouso** (`--shadow`: `0 1px 2px rgb(16 24 40 / 0.05), 0 2px 8px -2px rgb(16 24 40 / 0.06)`; escuro `0 1px 2px rgb(0 0 0 / 0.3)`): cards, linhas de item, grupos de ajustes, formulário de login.
- **Elevada** (`--shadow-lift`: `0 12px 32px -12px rgb(16 24 40 / 0.28)`; escuro `0 16px 36px -12px rgb(0 0 0 / 0.6)`): folhas, toasts, dica do gráfico.
- **Contorno interno** (`inset 0 0 0 2–2.5px`): marca o dia de hoje (cor `text`), o disco vazio de concluir (`line-strong`) e o item urgente (vermelho a 55%), sem ocupar espaço.

Folhas abrem sobre um véu `rgb(10 14 20 / 0.45)`.

### Named Rules
**The Pressable Edge Rule.** Volume de controle é uma borda inferior de 4 px mais escura (`primary-edge` no verde, `line` nos neutros) que encolhe no `:active` (para 1 px com `translateY(3px)` no principal; para 2 px com `translateY(2px)` nos neutros), em 90 ms. O toque se sente.

## Shapes

Tudo arredondado e gordo, sem cantos vivos. O raio cresce com o tamanho do contêiner: células de calendário 10 px, botões de ícone 12, botões, campos e quadradinhos 14, toasts e cards internos 16, opções e cards simples 18, linhas de item 20, cards 22, folhas 26 (só em cima no celular). Fichas, pílulas, barras e trilhos são cápsulas (99 px); o círculo de concluir, as bolinhas da semana e a medalha são círculos. A marca é um quadrado com raio de 30%.

Bordas de controle são de 2 px em `line`; divisórias internas de lista de 1 a 2 px. Barras de progresso têm 10 a 14 px de altura; a barra do passo leva um brilho branco a 35% por dentro.

## Components

### Buttons
Gordos, táteis e confiantes.
- **Shape:** cantos arredondados (14 px), altura mínima 48 px, 800 em 1rem, ícone e rótulo com 8 px entre si.
- **Primary:** fundo `primary`, texto `on-primary`, borda inferior de 4 px `primary-edge`. Ações de rodapé e de tela inteira crescem para 54 px e 1.0625rem.
- **Pressed / Disabled:** afunda conforme The Pressable Edge Rule; desabilitado a 45% de opacidade.
- **Focus:** anel global de 3 px em `primary-ink` a 70%, afastado 2 px.
- **Ghost:** fundo `surface`, texto `text`, borda de 2 px `line` com base de 4 px; `line-strong` no hover.
- **Danger:** como o fantasma, com texto `urgent-ink`.
- **Text button:** sem fundo, `primary-ink`, 800, 44 px de altura; esmaece a 70% ao tocar.
- **Icon button:** 44x44, transparente, `muted`; `raised` no hover; encolhe a 94% ao tocar.

### Chips
- **Style:** cápsula de 44 px (40 px nos filtros com rolagem), fundo `surface`, borda de 2 px `line` com base de 4 px, 800.
- **State:** selecionada vira `primary-soft` com borda e texto `primary-ink`. Fichas de dia da semana são de 42 px de largura.
- **Pílulas de status** (não clicáveis): cápsulas 900 em 0.9375rem com ícone; sequência em `flame-soft`/`flame-ink` com ícone `flame`, nível em `xp-soft`/`xp-ink` com ícone `xp`, sequência zerada em `raised`/`muted`.

### Cards / Containers
- **Corner Style:** 22 px nos cards e grupos, 20 px nas linhas e listas compactas, 18 px nos cards simples.
- **Background:** `surface` sobre `bg`.
- **Shadow Strategy:** sombra de repouso (ver Elevation & Depth).
- **Border:** nenhuma; listas de resumo do cadastro usam borda de 2 px `line` em vez de sombra.
- **Internal Padding:** 18 px nos cards, 14–16 px nos simples e grupos.
- **Aviso:** faixa de 16 px de raio em `urgent-soft` com texto `urgent-ink` e botão neutro de borda vermelha; configuração inicial em `primary-soft`.

### Inputs / Fields
- **Style:** fundo `surface`, borda de 2 px `line`, raio 14 px, 52 px de altura, 600 em 1rem; select com chevron desenhado em `muted` à direita.
- **Focus:** a borda vira `primary-ink` (sem anel extra).
- **Error:** mensagem em `urgent-ink` 700 abaixo do campo.
- **Interruptor:** chave de 52x32 em `line-strong`, `done` quando ligada, botão branco que desliza 20 px.
- **Stepper:** botões de 56 px ao lado de um número 900 em 2rem.

### Navigation
- **Celular:** barra fixa embaixo, `surface` com linha superior de 1 px; abas de 64 px com ícone sobre rótulo (0.75rem, 800, `muted`). Aba ativa em `primary-ink` com cápsula `primary-soft` de 56x30 atrás do ícone. No centro, o + verde de 56x48 com raio 16 e borda que afunda.
- **Desktop (1024 px+):** barra lateral de 248 px com marca, "Novo item" largo no topo e abas em linha de 50 px (raio 14); hover em `bg`, ativa em `primary-soft`.

### Linha de item (assinatura)
Quadradinho tingido à esquerda, nome em Item 800 com estrela dourada se essencial, linha de prazo em Meta com ícone de relógio; a linha de prazo vira `attention-ink`, `urgent-ink` ou `primary-ink` (cronômetro rodando) conforme o nível. À direita, o círculo de concluir de 52 px: disco vazio com contorno `line-strong`, que antecipa o check no hover e enche de `done` com o check branco ao tocar. Itens repetidos no dia mostram um anel segmentado (um arco por vez) e "2/5" no centro. Ao concluir sobe uma etiqueta "+XP" em `xp-soft`/`xp-ink`, e a linha recolhe depois de 520 ms.

### Quadradinho do item
46x46 com raio 14 (36 px/11 no compacto, 64 px/20 no grande), fundo da tinta da categoria, emoji em 1.5rem; sem emoji, a inicial do nome em `muted`.

### Folha e cadastro em passos
Folha de baixo com puxador de 40x5, raio 26 em cima, sombra elevada, entrada de 320 ms subindo 28 px. O cadastro ocupa a tela: cabeçalho com voltar, barra de progresso `done` de 14 px e fechar; pergunta em Headline de momento; opções grandes de 84 px em grade de 2 colunas (selecionada em `primary-soft`); rodapé fixo com botão de 54 px. Cada passo entra deslizando 18 px da direita.

### Dia fechado (celebração)
Tela cheia em `surface`, orquestrada em sequência: medalha circular de 128 px em `flame-soft` entra com `--spring`, depois título 900 em 2rem, frase, linha de sequência em cápsula laranja (o número dá um pulo com `--spring` quando cresce), três estatísticas com bordas de 2 px e o botão, cada um subindo 14 px com 80 ms de atraso entre si.

### Calendário do histórico
Grade de 7 colunas, células quadradas de raio 10: dia completo em `primary` com numeral branco, parcial em `primary-soft` com numeral `partial-ink`, sem nada em `urgent-soft`/`urgent-ink`, pulado riscado em `raised`; hoje com contorno interno de 2.5 px em `text`.

### Movimento
`--ease` (`cubic-bezier(0.16, 1, 0.3, 1)`) em tudo: 90 ms no afundar do botão, 160–220 ms em cor e interruptor, 300–420 ms em entradas e barras, 600–700 ms no enchimento de anéis e barras de progresso. Com `prefers-reduced-motion: reduce`, toda animação e transição cai para 1 ms e a espera antes de recolher a linha some.

**The Spring Is A Reward Rule.** `--spring` (`cubic-bezier(0.34, 1.56, 0.64, 1)`) só existe no pulo do check ao concluir e na tela Dia fechado (medalha e número da sequência). Navegação, folhas e listas nunca quicam.

## Do's and Don'ts

### Do:
- **Do** use o verde `primary` para toda ação principal e `done` para todo estado concluído.
- **Do** dê a todo botão, ficha e opção a borda inferior de 4 px que afunda no `:active`.
- **Do** mantenha todo alvo de toque em 44 px ou mais, e a ação principal de um passo em 54 px de largura total.
- **Do** escreva texto sobre fundo suave com o `-ink` da mesma família, e crie um token de contraste (como `partial-ink`) quando o par não passar de 4.5:1.
- **Do** use os ícones de traço de `Icon.vue` (24x24, traço 2, pontas redondas) e acrescente novos no mesmo desenho.
- **Do** defina toda cor nova como token nos dois temas, em `:root` e no bloco `prefers-color-scheme: dark`.
- **Do** coloque números que mudam em `tabular-nums` e peso 900.

### Don't:
- **Don't** use laranja fora da sequência, dourado fora do XP, âmbar ou vermelho fora de prazo e erro, nem tinta de categoria fora do quadradinho do item.
- **Don't** crie um segundo verde, uma segunda cor de botão ou botão em cor semântica.
- **Don't** use `--spring` fora do check e da tela Dia fechado.
- **Don't** ponha nada flutuando sobre a borda direita das linhas, onde fica o círculo de concluir.
- **Don't** volte ao painel escuro com vários botões em cada card: a linha tem um toque de concluir, o resto vai para a folha de detalhes.
- **Don't** use texto em caixa alta, rótulos acima de títulos, ou uma segunda família tipográfica.
