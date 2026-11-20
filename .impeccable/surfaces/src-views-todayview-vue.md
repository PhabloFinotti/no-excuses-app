---
version: 1
slug: "src-views-todayview-vue"
primary_target: "src/views/TodayView.vue"
related_targets: ["src/components/ItemForm.vue","src/views/ItemsView.vue","src/views/HistoryView.vue","src/views/SettingsView.vue","src/views/LoginView.vue","src/App.vue","src/style.css"]
---

# Superfície: app inteiro (Hoje, cadastro em passos, Itens, Histórico, Ajustes, Login)

Modo: Operate. Público e tarefa em PRODUCT.md. Celular primeiro (PWA Android), desktop com barra lateral a partir de 1024 px.
Pedido: apresentação dos itens mais clara, cadastro amigável em passos curtos, motivação (sequência, fechar o dia, meta da semana, pontos e níveis), histórico que diga algo.
Régua de acabamento escolhida pelo dono: Duolingo e Todoist.
Momento memorável: tocar no círculo e ver o item virar feito (+XP), e a tela "Dia fechado" ao terminar tudo.
Em aberto: meta da semana fixa em 5 dias até existir ajuste; regra da sequência = dias fechados (tudo feito ou pulado).

## Direction contract

THESIS: O padrão dos apps de hábito executado com capricho: uma lista calma onde cada item está a um toque de feito, o prazo calculado da hora de dormir dito em palavras simples, e progresso que se sente (sequência, XP, dia fechado). Recusa o painel escuro antigo com cinco botões em cada card.

OWN-WORLD: Fundo claro cinza-azulado com linhas brancas e tinta quase preta (variante escura segue o sistema). Um verde de ação para feito e botão principal; laranja da chama só na sequência; dourado só no XP; rampa âmbar e vermelho só para urgência. Quadradinhos arredondados tingidos pela categoria guardam o emoji do item. Nunito arredondada em pesos fortes; botões principais com borda inferior mais escura que afunda ao tocar; ícones de traço desenhados.

STORY: Ao abrir, a pessoa vê saudação, sequência, o anel "3 de 8 · 2h10 até dormir" e o próximo item com "comece até". Toca no círculo: ele enche, sobe +10 XP, a linha vai para Feitos. No último, a tela "Dia fechado". Criar item são três passos com opções grandes.

FIRST VIEWPORT: Topo: data e saudação à esquerda, chips de sequência e nível à direita. Card do dia: anel de progresso, contagem, tempo até dormir e aviso de déficit dentro dele. Depois "Agora": quadradinho com emoji, nome, linha do prazo colorida pela urgência e círculo de concluir à direita (anel segmentado nos itens repetidos). Botão + redondo embaixo à direita, acima de quatro abas.

FORM: padrão da categoria (saída padrão escolhida pelo dono, sobre a direção sorteada, que era a 6 da lista), afinado pela régua Duolingo e Todoist. seed:6cddcef88d9749c2

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
