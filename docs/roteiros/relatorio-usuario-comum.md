# Relatório: usuário comum (roteiro 1)

**Método.** A extensão Chrome não respondeu em 2 tentativas (`tabs_context_mcp` expirou), então, conforme instruído, não insisti. **Nenhum passo foi verificado no navegador.** Todos os achados são **[INFERIDO DO CÓDIGO]**, lendo `src/App.vue`, `src/views/*.vue`, `src/components/*.vue`, `src/lib/quickAdd.ts`, `src/lib/categories.ts` e trechos de `src/style.css`. Comportamento visual real (cores, animação, tamanho de toque, rolagem) não foi visto. Nenhum arquivo de código foi alterado.

## (a) Passo a passo

| # | Passo | Resultado | Observação [INFERIDO DO CÓDIGO] |
|---|-------|-----------|------------|
| 1 | Primeira impressão de Hoje | Atrito | `TodayView.vue:87-94`: data, "Hoje", barra e "2/5 feitos · 3h até dormir". Sem legenda para cores, barra nem selos. "feitos" e "até dormir" são entendíveis; o resto fica por conta do usuário. Pode aparecer ainda o card de onboarding "Instale o app (1/3)" (`OnboardingCard.vue:29-31`) antes de qualquer conteúdo. |
| 2 | Entender um item | Atrito | `ItemCard.vue:52`: "30 min · Leitura · começar até 14:30". "Começar até" é compreensível, mas a barra (`:59-62`) tem só o rótulo de tempo ("1h 20min", "há 10 min", "agora") sem dizer "para começar". O aria-label diz, o texto visível não. Selos Atenção/Urgente/Atrasado (`:45-47`) não explicam o limiar. |
| 3 | Concluir com "Feito" | Passou | `TodayView.vue:45-60`: confete, vibração, toast "X feito." com Desfazer. Bom retorno. Atrito: se não usou cronômetro, vira "feito · 30 min (previsto)" com botão "Ajustar tempo" (`:56-58`); "previsto" é jargão. |
| 4 | Cronômetro | Atrito | Ícone play/pause sem texto (`ItemCard.vue:71-73`), só `title` (não existe no toque). Depois surge `12:34 / 30:00` (`:66`) e é um link que abre o detalhe, não óbvio. "Foco" é outro ícone sem texto (`:74`). Concluir pelo "Feito" com timer rodando usa o tempo medido, mas nada diz isso. |
| 5 | Adiar e pular | Travou (parcial) | `ItemCard.vue:75-76`: dois ícones sem texto (soneca e skip). "Adiar" só adia o **alerta** em 10 min (não o item) e só aparece em nível ≠ normal; "Pular hoje" para hábito vs. "Descartar" para tarefa (muda o rótulo do mesmo ícone). Diferença só descobrível por `title`/aria. |
| 6 | "+" com `Ler 20`, `Ler por 20 minutos`, `Beber água` | Atrito | `QuickAdd.vue:35-48`. O padrão do tipo é **"Tarefa de hoje"** (`:11`), então um hábito digitado vira tarefa sem aviso. Ajuda (`:41`) longa e densa. `Ler 20` e `Ler por 20 minutos` viram "Ler / 20 min" (`quickAdd.ts:8-14`); `Beber água` vira 30 min (padrão). O toast é só "X adicionado." sem dizer duração/onde. |
| 7 | Formulário completo | Atrito | `ItemsView.vue:53-55` e `ItemForm.vue`. Funciona, mas: "Atenção (min antes)" e "Urgente (min antes)" (`:91-92`) sem explicação; "Horário fixo (opcional)" sem dizer o efeito; "Essencial (último a ser pulado)" (`:89`) obscuro; "Dias" como D S T Q Q S S ambíguo (T/Q/S repetidos, `:13`); "Categoria: Automática (...)" ok. |
| 8 | Tarefa avulsa para amanhã | Atrito | `setKind('task')` já preenche data = hoje (`ItemForm.vue:25`); seletor de data nativo. Ela aparece em Hoje só amanhã (não em Hoje) por filtro de data, mas **nada confirma onde ela foi parar**: o formulário fecha e o toast só traz "Agenda" (`:53-56`). Em Itens a linha mostra "Tarefa · data". |
| 9 | Editar e arquivar | Atrito | Editar/arquivar são ícones na lista de Itens (`ItemsView.vue:~75-76`); em Hoje, abrir pelo nome ou "Detalhes" → aba "Editar item". "Arquivar" parece apagar e **não há tela para ver ou restaurar arquivados**: a única recuperação é o "Desfazer" do toast (`ItemsView.vue:38-41`; `archivedItems` só alimenta o histórico, `store.ts:31`). |
| 10 | Histórico | Atrito | `HistoryView.vue`: muitas seções (itens/dia, tempo/dia, média por dia da semana, calendário, hábitos, categorias). Jargões: "média de 7 dias", "metade leva até X min, 80% até Y" (`:224`), "p80", "sequência". Calendário com legenda mudando conforme o filtro. Frase "Você rende mais na terça-feira" (`:178`) é uma conclusão forte com poucos dados. |
| 11 | Ajustes | Atrito | `SettingsView.vue`. "Acordo/Durmo" ok. Campo livre "Fuso horário" (`:48`) assusta (texto livre tipo America/Sao_Paulo). "Tolerância de hábito com horário fixo (min)" (`:54`) e "Aviso de fim do dia" são opacos. Erro de dormir ≤ acordar (`:32`) bloqueia quem dorme depois da meia-noite. |
| 12 | Notificações | Atrito | `SettingsView.vue:63-79`: "Ativar", "Enviar teste", "Verificar situação" + texto específico de Samsung. Duplicado com o card de onboarding. Não explica *por que* nem o que vai chegar antes de pedir permissão. |
| 13 | Desktop 1280 px | Passou (inferido) | `style.css:293+`: barra lateral de 248 px e painel lateral em Hoje (`.split-aside`). Não é "celular esticado" pelo CSS, mas não foi visto. |

## (b) Os 10 maiores problemas de usabilidade (por gravidade)

1. **Ícones sem texto para ações-chave** (iniciar timer, foco, adiar, pular): `ItemCard.vue:71-76`. No celular não há `title`/hover. Quem não conhece o app não sabe o que cada um faz. Tabela do passo 4/5.
2. **"Adiar" e "Pular" confusos**: "adiar" mexe só no alerta por 10 min, aparece só às vezes, e "pular" vira "descartar" para tarefas (`ItemCard.vue:75-76`; `TodayView.vue:64`). O usuário espera "adiar para mais tarde/amanhã".
3. **Arquivar parece apagar e não há como ver/restaurar arquivados** (`ItemsView.vue:33,38-41`). Só o toast (5 s) permite desfazer.
4. **Item rápido vira "Tarefa de hoje" por padrão** (`QuickAdd.vue:11`); quem queria um hábito (ex.: "Beber água") cria uma tarefa única. A escolha está abaixo do campo, depois de um parágrafo de ajuda.
5. **Nenhuma legenda de cores/barra/selos na tela Hoje** (`ItemCard.vue:45-62`); a barra mostra só um tempo, sem "para começar".
6. **Jargão de tempo: "previsto", "Atenção/Urgente (min antes)", "Tolerância de hábito com horário fixo", "essencial (último a ser pulado)"** (`ItemForm.vue:89-92`; `SettingsView.vue:51-54`; `TodayView.vue:56`).
7. **Formulário/Configuração com muitos campos avançados na frente** (`ItemForm.vue:73-93`, `SettingsView.vue:44-58`): fuso em texto livre, limiares, tolerância.
8. **Duas rotas de criação concorrentes** (FAB "+" e campo rápido em Itens, `ItemsView.vue:51-55`) com rótulos diferentes ("Tarefa de hoje/Hábito todo dia" vs "+ Tarefa hoje/+ Hábito diário").
9. **Sem confirmação de *onde* o item novo foi parar** (toast "X adicionado." e nada mais; tarefas futuras não aparecem em Hoje): `QuickAdd.vue:23`, `ItemForm.vue:53-57`.
10. **Histórico denso e técnico** (`HistoryView.vue:224, 178`): percentis, médias móveis, muitas seções; e dias dependem de dados que o usuário novo não tem.

Menores: onboarding de 3 passos no topo (instalar, notificação, bateria) antes do conteúdo (`OnboardingCard.vue`); ajuda de Samsung em Ajustes para quem não usa Samsung (`SettingsView.vue:76-79`); dias da semana "D S T Q Q S S" (`ItemForm.vue:13`).

## (c) Textos e botões confusos, com sugestão

| Onde | Atual | Sugestão |
|---|---|---|
| `ItemCard.vue:71` | ícone play/pause | "Iniciar" / "Pausar" com texto ou ao menos rótulo visível |
| `ItemCard.vue:74` | ícone "Foco" | "Foco" com texto, ou tela cheia com "Modo foco" no tooltip |
| `ItemCard.vue:75` | ícone "Adiar alerta em 10 minutos" | "Avisar de novo em 10 min" |
| `ItemCard.vue:76` | "Pular hoje" / "Descartar tarefa" | "Não vou fazer hoje" (hábito) / "Excluir tarefa" |
| `ItemCard.vue:52` | "começar até 14:30" | "Começar até 14:30 (senão não dá tempo)" ou legenda única na tela |
| `TodayView.vue:56` | "(previsto)" | "usei o tempo estimado" |
| `QuickAdd.vue:41` | texto longo de ajuda | "Ex.: Ler 20 min, Correr 1h30. Sem tempo, vale 30 min." |
| `QuickAdd.vue:43-44` | "Tarefa de hoje" / "Hábito todo dia" | Manter, mas deixar visível e antes do campo; ou padrão "Hábito" quando o nome é ambíguo |
| `QuickAdd.vue:23` | "X adicionado." | "Ler adicionado: tarefa de hoje, 20 min." |
| `ItemForm.vue:89` | "Essencial (último a ser pulado)" | "Importante: só pule este por último" |
| `ItemForm.vue:91-92` | "Atenção / Urgente (min antes)" | "Avisar quantos min antes" / "Avisar como urgente quantos min antes" (e esconder em "Avançado") |
| `ItemForm.vue:81` | "Horário fixo (opcional)" | "Hora marcada (opcional)" |
| `ItemForm.vue:13` | D S T Q Q S S | Dom Seg Ter Qua Qui Sex Sáb |
| `ItemsView.vue:33` | ícone "Arquivar" | "Arquivar (guarda no histórico)" + tela "Arquivados" com Restaurar |
| `SettingsView.vue:48` | "Fuso horário" campo livre | Lista/auto-detectado, esconder se igual ao do aparelho |
| `SettingsView.vue:54` | "Tolerância de hábito com horário fixo (min)" | "Quantos min depois da hora marcada ainda conta" |
| `HistoryView.vue:224` | "metade leva até 20 min, 80% até 35 min" | "Costuma levar 20 min (quase sempre menos de 35)" |

## (d) O que o app faz bem [INFERIDO DO CÓDIGO]

- Concluir tem retorno forte e é reversível: confete, vibração, toast com **Desfazer**, e ajuste de tempo logo em seguida (`TodayView.vue:45-60`). Há também "Desfazer" em Feitos hoje (`:167`).
- Entrada rápida inteligente: aceita "Ler 20", "Ler por 20 minutos", "1h30" (`quickAdd.ts`); categoria automática com pré-visualização (`ItemForm.vue:75`).
- Banner que avisa quando não cabe tudo antes de dormir, com ação "Pular" (`TodayView.vue:99-107`).
- Estado vazio e "Dia fechado. Sem desculpas." (`:109-114`), progresso do dia com "x/y feitos · tempo até dormir".
- Bom suporte de acessibilidade: aria-labels nos botões-ícone, `role=alert/status`, `aria-pressed`, foco em modais (`App.vue:104`, `FocusMode.vue:24`).
- Ações irreversíveis são raras; arquivar tem toast desfazer; tarefas antigas ficam em "Paradas há dias" com "Fazer hoje / Descartar" (`TodayView.vue:145-155`).
- Layout responsivo previsto: barra inferior no celular, lateral no desktop (`style.css:163, 293+`).

## Não verificado

Tudo, no navegador (extensão indisponível). Também não vi o tamanho real de alvos de toque, contraste, animações, o texto exato renderizado dos selos, nem o conteúdo dos dados de demonstração.
