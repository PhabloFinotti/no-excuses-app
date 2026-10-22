# Relatório: usuário avançado (roteiro 2)

## Como foi feito
- **Navegador: não foi possível.** A extensão Chrome não respondeu em 2 tentativas (`tabs_context_mcp` expirou nas duas). Seguindo a regra, parei de insistir. Nenhum achado abaixo é [VERIFICADO NO NAVEGADOR]; os passos 14 (Tab/foco visível real) e 15 (390/820/1280 px) ficam **sem verificação visual** e precisam ser refeitos com o navegador.
- **Lógica executada** com `tsx` sobre `parseQuickAdd`, `detectCategory`, `calculateState`, `computeStats`, `computeCategoryStats`, `computeHabitDetail` (script em `/private/tmp/claude-501/-Users-phablofinotti-Developer-no-excuses-app/34967f76-dfa9-4d58-b1f6-af3703f4a0a2/scratchpad/t.mts`). Marcados [VERIFICADO EXECUTANDO A LÓGICA].
- **Código lido** (views, componentes, store, CSS). Marcados [INFERIDO DO CÓDIGO].
- Nenhum arquivo do código-fonte foi alterado.

---

## (a) Bugs

### B1. "Mesmo assim faltam X min" aparece mesmo quando pular a sugestão resolve o déficit. Gravidade: ALTA (texto do banner principal contradiz a sugestão)
[VERIFICADO EXECUTANDO A LÓGICA]
Reproduzir (lógica): dormir 22:00, agora 19:30, três itens flexíveis de 60 min, nenhum essencial. Resultado: `deficitMin: 30`, `suggestSkips: ['a']` e `unavoidableMin: 30`. Pular "a" (60 min) cobre o déficit, então `unavoidableMin` deveria ser 0.
Causa: `supabase/functions/_shared/calculateState.ts:75-83`. No ramo `single` (linha 76) o `left` nunca é decrementado, então `unavoidableMin = left = deficitMin`.
Efeito na tela: `src/views/TodayView.vue:104` mostra "Sugestão: pular X. Mesmo assim faltam 30 min: só sobram itens essenciais ou com horário fixo." para itens que não são essenciais nem fixos. Os testes (`calculateState.test.ts:63,70`) só cobrem o caminho com vários itens, por isso passou.
Correção: no ramo `single`, `left -= single.durationMin`.
Segundo caso (mesmo defeito): com 2 essenciais, 1 flexível de 60 e 1 de 20 min, `deficitMin 50`, sugere pular o de 60 e reporta `unavoidableMin: 50`.

### B2. Item pulado some da tela e não há como desfazer depois dos 5 s do toast. Gravidade: ALTA para quem usa muito
[INFERIDO DO CÓDIGO]
`rows` (TodayView:17-21) exclui itens pulados (`isPending`, `pending.ts:50`) e "Feitos hoje" só lista `done` (`store.ts:53-59`). Pulou sem querer e o toast (5 s, `toast.ts`) expirou: o item some até amanhã, sem lista de "Pulados hoje". O mesmo vale para "Descartar" tarefa e para o "Pular" do banner (que pula vários de uma vez).

### B3. Item arquivado só se recupera pelo toast de 5 s
[INFERIDO DO CÓDIGO] Gravidade: ALTA
`unarchiveItem` só é usado em `ItemsView.vue:40` (undo do toast). Não existe tela de arquivados em lugar nenhum (grep). Passou o toast, o item (e seu histórico por hábito) só volta por SQL. O Histórico por hábito também não lista arquivados (`HistoryView:34`).

### B4. Só o último toast pode ser desfeito
[INFERIDO DO CÓDIGO] Gravidade: MÉDIA
`toast.ts:8-12`: um único toast, `notify` sobrescreve o anterior. Concluir/pular três itens em sequência (o fluxo normal de quem usa muito) deixa só o último desfazível. O desfazer dos outros exige achar o item em "Feitos hoje" (e pulados não têm onde, ver B2).

### B5. Número no fim do nome vira duração e é removido do nome. Gravidade: MÉDIA
[VERIFICADO EXECUTANDO A LÓGICA]
- `Café 5` -> nome "Café", 5 min.
- `Ler capítulo 3` (mesma regra, BARE em `quickAdd.ts:4`) -> nome "Ler capítulo", 3 min. `Estudar aula 12` -> "Estudar aula", 12 min.
- `Ler 100` -> 100 min. `Ler 1000` -> nome "Ler 1000", 30 min (silencioso).
O mesmo acontece no formulário completo ao sair do campo Nome (`ItemForm.vue:31-38`, `@blur`), sobrescrevendo a duração já digitada e alterando o nome sem aviso (nem toast).

### B6. Mensagem de erro de duração inválida é genérica e engana
[VERIFICADO EXECUTANDO A LÓGICA] Gravidade: BAIXA/MÉDIA
`Ler 25h`, `Ler 1500 min`, `Ler 25 h`, `45` e texto vazio retornam todos `null`, e a UI mostra "Digite um nome e, se quiser, a duração" (`store.ts:217`). Para "Ler 25h" o usuário DIGITOU a duração; a mensagem deveria dizer "duração máxima 24h (1440 min)". Já `Ler 1441` vira nome "Ler 1441" com 30 min sem avisar (inconsistente com `Ler 1500 min`, que é rejeitado). `45` sozinho é rejeitado sem explicar que falta nome.

### B7. "Ler 1h75" = 135 min; "Ler 1,5h", "Ler 1.5h", "Ler 2 hs" não são entendidos
[VERIFICADO EXECUTANDO A LÓGICA] Gravidade: BAIXA
Minutos > 59 após o "h" são aceitos (`\d{1,2}`), e decimais ficam no nome ("Ler 1,5h", 30 min). Um usuário avançado digita "1,5h".

### B8. Formulário completo: nome só de espaços e sem trim
[INFERIDO DO CÓDIGO] Gravidade: BAIXA/MÉDIA
`ItemForm.vue:72` usa `required` (aceita "   ") e `submit` (linha 52) não faz `trim()`. A adição rápida faz trim; o formulário não. Também não há limite de tamanho do nome (na adição rápida, nome de 300+ caracteres foi aceito, [VERIFICADO EXECUTANDO A LÓGICA]; efeito visual no card não verificado).

### B9. Perda silenciosa de edição ao fechar a folha
[INFERIDO DO CÓDIGO] Gravidade: MÉDIA
`Sheet.vue:12-13,42`: Esc e clique no fundo (scrim) fecham sem confirmar. Na aba "Editar item" (ItemSheet) e no Adicionar rápido, qualquer toque fora ou Esc descarta tudo que foi digitado. O formulário do aba Itens (`ItemsView`) não tem esse problema (não é folha).

### B10. Vários timers podem rodar ao mesmo tempo
[INFERIDO DO CÓDIGO] Gravidade: MÉDIA
`startTimer` (`store.ts:167`) não pausa outros. Dois timers correndo somam em "Tempo dedicado por dia" (soma de `spent_min`), dando mais minutos do que existem no dia. Também: timer rodando virando a meia-noite fica na conclusão do dia anterior (hábito usa `findCompletion` por `day === hoje`, `pending.ts:38`) e some da tela.

### B11. Arredondamento do timer difere entre "Feito" e a folha de tempo
[INFERIDO DO CÓDIGO] Gravidade: BAIXA
Com timer em 0:30 a 0:59: "Feito" grava o previsto (`finishMinutes`, `pending.ts:69`: só >= 60 s conta), mas a folha de tempo mostra 1 min (`ItemSheet.vue:22`, `Math.round`) e "Concluir com 1 min". Dois números diferentes para o mesmo timer.

### B12. Folha de tempo limita a 600 min, formulário aceita 1440
[INFERIDO DO CÓDIGO] Gravidade: BAIXA
`ItemSheet.vue:26` (`clamp` até 600) x `ItemForm.vue:46` (até 1440). Um item de 12 h não pode ter o tempo real registrado acima de 10 h.

### B13. "Dia fechado" aparece com tarefas paradas pendentes
[INFERIDO DO CÓDIGO] Gravidade: BAIXA
`allDone` (TodayView:33) ignora `staleTasks`. Resultado: "Dia fechado. Tudo feito." convivendo com a seção "Paradas há dias". E se o usuário só pulou tudo, vê "Nada para hoje. Cadastre um hábito..." (linha 114), que não reflete o que ocorreu.

### B14. Rótulo "atrasada de ontem" para tarefas com 2 e 3 dias
[INFERIDO DO CÓDIGO] Gravidade: BAIXA
`ItemCard.vue:18` é texto fixo para qualquer `due_date < hoje`. Só vira "parada" com > 3 dias (`pending.ts:54-58`, ou seja, 4 dias). No cenário do roteiro (1 dia = "de ontem" correto; 4 dias = "Paradas há dias"); entre 2 e 3 dias o texto mente.

### B15. Barra "x/y feitos" melhora ao pular
[INFERIDO DO CÓDIGO] Gravidade: BAIXA
`total = rows + doneToday` (TodayView:26): pular um item o tira do denominador (3/5 vira 3/4 = 75%). Pode ser intencional, mas o usuário rigoroso lê como número que "não bate" (começou com 5 itens).

### B16. Restaurar backup sobrescreve sem avisar e não restaura o perfil
[INFERIDO DO CÓDIGO] Gravidade: MÉDIA
`backup.ts:62-67` faz `upsert` por `id`: sobrescreve itens com mesmo id (inclusive `archived`) sem confirmação nem contagem ("Backup restaurado." genérico). O backup não inclui `profiles` (acordar/dormir/fuso/limites) nem `push_subscriptions` (`backup.ts:38-41`). O `input[type=file]` mantém o mesmo arquivo; reescolher o mesmo arquivo não dispara `change`.

### B17. Sem como definir horário de dormir depois da meia-noite
[INFERIDO DO CÓDIGO] Gravidade: MÉDIA para quem dorme tarde / trabalha à noite
`SettingsView.vue:32` rejeita dormir <= acordar ("no mesmo dia"), e todo o cálculo usa minutos do mesmo dia (`calculateState`). Quem dorme 01:00 não consegue configurar; a mensagem de erro é clara, mas a limitação não é.

### B18. Limites de atenção/urgente sem coerência
[VERIFICADO EXECUTANDO A LÓGICA] Gravidade: BAIXA
`calculateState` com `warnMin: 0, urgentMin: 50` vira `urgent` sem erro. Nem o formulário (`ItemForm.vue:91-92`) nem Ajustes validam urgente <= atenção nem valores maiores que a duração. Atenção menor que urgente faz o nível "Atenção" nunca aparecer. Valores negativos são barrados só pelo `min=0` nativo.

### B19. Ajuste de duração sugerido é aplicado sem feedback nem desfazer
[INFERIDO DO CÓDIGO] Gravidade: BAIXA/MÉDIA
`HistoryView.vue:111,228`: `act(() => setDuration(...))` sem `notify`. O botão some e o usuário não sabe se mudou. Além disso a sugestão usa a MÉDIA (`stats.ts:61`) enquanto a tela destaca P50/P80; a sugestão muda conforme o período 7/30/90 (precisa de >= 3 amostras na janela).

---

## (b) Inconsistências de números ou textos

1. **Categoria x calendário.** Na categoria "Leitura" o card diz "21/22 dias com atividade" (qualquer item feito, `stats.ts:139,155`), mas o calendário logo abaixo usa as células de `computeStats` (todos os itens agendados), pintando como "Parcial" dias que o card conta como atividade. [VERIFICADO EXECUTANDO A LÓGICA: 21 dias ativos no card; o calendário usa a regra done === scheduled]. A legenda "Tudo feito/Parcial/Nada feito" não explica.
2. **Janela menor que o período.** Com "30 dias" selecionado, a série tem 22 dias porque começa no primeiro item (`stats.ts:25-26`). Os cartões mostram "21/22", "média por dia" usa 22 como divisor, e nada diz que o período foi encurtado. [VERIFICADO EXECUTANDO A LÓGICA]
3. **Sequência limitada ao período.** `streak` percorre só a janela (`stats.ts:51-55,114-119,158-161`): com 7 dias selecionados a sequência nunca passa de 7 (ou 30/90). Uma sequência de 45 dias aparece como 7 em "7 dias". [INFERIDO DO CÓDIGO]
4. **Pulado: cor x conta.** No histórico do hábito, "Pulado" é laranja (neutro), mas entra no denominador como não cumprido (`stats.ts:103`, `counted`) e zera sequência (`stats.ts:111-113`). O texto "X de Y dias agendados" não diz isso. [INFERIDO DO CÓDIGO]
5. **Hábito arquivado.** Em `computeStats`, para após `archived_at` (14 agendados, 7 feitos, 50%) [VERIFICADO EXECUTANDO A LÓGICA]. `computeHabitDetail` (`stats.ts:93`) ignora `archived_at` (21 agendados, 33%), mas essa tela não é alcançável hoje pois a lista de hábitos exclui arquivados. Divergência latente.
6. **Tolerância de hábito.** Ajustes diz "Tolerância de hábito com horário fixo" (`SettingsView:54`), mas `calculateState.ts:62` aplica a qualquer item fixo, inclusive tarefa.
7. **Cálculo do dia (passo 1).** [VERIFICADO EXECUTANDO A LÓGICA] A empilhagem fecha: dormir 22:00 com itens de 20/30/60/60 min (dois essenciais) dá limites 21:40, 20:40, 20:10 e 19:10, sem sobreposição; essenciais ficam com os horários mais cedo. Item fixo (21:50, 30 min) desvia o flexível corretamente (flexível 20:50 -> limite 20:50, déficit 0).
8. **Depois de dormir.** [VERIFICADO EXECUTANDO A LÓGICA] às 23:00 com um item de 30 min: déficit 90 e `unavoidableMin 60`. O banner diz "Faltam 1h30"; o "até dormir" some do cabeçalho (`sleepLeftMin` vira 0, TodayView:28,92) sem texto no lugar.
9. **"Descartar" x "Pular".** Mesmo ícone e mesma ação (`skip`) para tarefa e hábito; só o aria-label/toast muda.
10. **CSV.** [INFERIDO DO CÓDIGO] sem BOM UTF-8 (acentos quebram no Excel), sem categoria, sem `time_source` (não distingue previsto de cronometrado), sem horário/duração prevista.
11. **Erro do Google Agenda.** Sem credenciais, o botão mostra "Conexão com o Google indisponível (confira o deploy das functions)." (`store.ts:258`): texto de desenvolvedor para o usuário final. [INFERIDO DO CÓDIGO]

### Categorias (passo 4) [VERIFICADO EXECUTANDO A LÓGICA]
| Entrada | Categoria |
|---|---|
| Leitura, Ler, Ler livro tal | Leitura |
| Estudar Kubernetes, Estudar DSA, Estudar inglês | Estudo |
| Meditar, Terapia | Mente |
| Pagar conta de luz, Conta de luz | Finanças |
| Xablau, Calendário | nenhuma (correto, "ler" não casa em "calendário") |
| Ler contrato do trabalho | Leitura (empate 1x1 com Trabalho, vence a primeira do catálogo) |
| Passear com o cachorro, Lição de casa | nenhuma (ficam sem categoria; "casa" não é palavra-chave) |
Troca manual e "Sem categoria" têm lógica correta (`categoryOf`, `categories.ts:39-43`); a categoria automática acompanha a renomeação por ser calculada na leitura. O filtro de Itens lista só categorias presentes (`ItemsView:18`), mas **se o último item da categoria filtrada mudar, o `select` fica em branco e a lista vazia** (o valor de `filter` não é limpo) [INFERIDO DO CÓDIGO].

---

## (c) Fluxos com menos cliques

- **Adicionar tarefa em Itens:** Enter cria sempre *tarefa de hoje* (`ItemsView:51`), sem aviso; placeholder só diz "Adicionar rápido". Sem toast de sucesso (só limpa o campo) e o item novo vai ao FIM da lista (`order('created_at')`), fora da tela com 20+ itens. Sugestão: toast "X adicionado" + rolar/destacar o novo, e rótulo claro de qual tipo o Enter cria.
- **Fazer amanhã / adiar tarefa:** hoje exige Detalhes -> aba Tempo -> "Fazer amanhã" (3 toques e uma folha). Falta botão no card ou no menu.
- **Corrigir tempo:** Feito (card) -> toast "Ajustar tempo" (7 s) -> folha. Se perder o toast, vai por "Feitos hoje" -> chip do tempo. Ok, mas o toast é a única via rápida.
- **Ver histórico de um hábito:** Histórico -> abrir menu -> escolher (ou "Ver histórico" no card). Do card do hábito em Hoje/Itens não há atalho para o histórico dele.
- **Pular/Concluir vários:** não há seleção múltipla; só o "Pular" sugerido do banner.
- **Mudar tipo ao criar (FAB):** o padrão é sempre "Tarefa de hoje"; quem adiciona só hábitos precisa alternar sempre (não lembra a última escolha).
- **Tarefa parada:** "Fazer hoje" depois "Feito" (2 passos) para concluir algo que já foi feito; falta "Concluir" direto.
- **Snooze fixo de 10 min** (`store.ts:191`), sem opção de 30 min / 1 h; botão só aparece quando o nível não é normal.

## (d) Ações ou botões ambíguos

| Onde | Problema | Sugestão |
|---|---|---|
| Banner "Pular" (TodayView:106) | Não diz quantos nem quais | "Pular 2 itens" |
| Ícone "skip" no card | Mesmo ícone para pular hábito e descartar tarefa; dura e some (B2) | Ícones diferentes; "Descartar" com cor de destrutivo ou confirmação por toast longo |
| "Só salvar o cronômetro" (ItemSheet:82) | Para o timer em andamento sem avisar | "Salvar e pausar cronômetro" |
| "Feito" com tempo previsto | Grava o previsto como se fosse real (contam em "Tempo dedicado") | Já avisa no toast ("previsto" + "Ajustar tempo"); ok, mas o gráfico de tempo mistura previsto e real (texto do gráfico avisa) |
| "Tolerância de hábito com horário fixo" | Vale para tarefas também | "Tolerância de itens com horário fixo" |
| "Aviso de fim do dia (min antes de dormir)" | Não diz que depende de "Aviso antes de dormir" estar marcado | Desabilitar o campo quando desmarcado |
| "Verificar situação" (push) | Texto técnico: "Último envio aceito pelo provedor... (aceito não garante que apareceu na tela)" é honesto porém denso | Resumir em um estado ("Tudo certo" / "Falta permissão") e mostrar detalhes sob "ver detalhes" |
| "Sair" em Ajustes | Sem confirmação, logo depois de Dados | Separar visualmente ou confirmar |
| Formulário: botão "Salvar" desabilitado sem nenhum dia marcado (ItemForm:96) | Não explica por quê | Mensagem "Marque ao menos um dia" |

## (e) Recursos que faltam para quem usa muito

1. Tela de **arquivados e pulados** com restaurar (B2/B3), e desfazer em fila (B4).
2. **Edição em lote / seleção múltipla** (arquivar, mudar categoria, pular).
3. **Busca** na lista de Itens (hoje só filtro por categoria) e ordenação (a lista é por criação).
4. **Tarefas concluídas nunca saem da lista Itens** [INFERIDO DO CÓDIGO: não há arquivamento automático nem filtro por estado em `ItemsView`; `shown` mostra tudo que não está arquivado]. Com o tempo a lista de "Cadastrados" é dominada por tarefas já feitas, sem indicador de status.
5. **Dormir após meia-noite** (B17) e horários por dia da semana (fim de semana diferente).
6. **Hábitos que não são "todo dia" na adição rápida** (só dá todos os dias); atalhos de dias úteis.
7. **Snooze configurável**, **exclusividade de timer** (B10) e timer que atravessa a meia-noite.
8. **Backup completo** (perfil), com prévia do que será importado, e CSV com categoria/fonte do tempo.
9. **Atalhos de teclado** (ex.: N para novo, Enter para concluir o item focado). Não há nenhum atalho global.
10. **Histórico:** comparar períodos, sequência real (sem teto da janela), exportar por categoria.

## (f) O que está excelente

- **Anti-duplicação:** `saveItem` gera o `id` no cliente e usa `upsert`; o formulário gera o id uma vez por instância (`ItemForm.vue:15`), e `adding`/`busy` bloqueiam Enter repetido na aba Itens e no FAB (`ItemsView:26`, `QuickAdd:19`). [INFERIDO DO CÓDIGO] Não testei no navegador, mas a proteção é em duas camadas.
- **Fila de escritas por item** (`serial.ts`, `store.ts:140-164`): toques repetidos em concluir/desfazer/pular no mesmo item são serializados e a tela é otimista; `loadAll` descarta leituras que cruzaram uma escrita. Desenho cuidadoso contra o estado "pulando" na tela. [INFERIDO DO CÓDIGO]
- **Cálculo do dia** correto e explicável: essenciais ganham os horários mais cedo, itens fixos são contornados, o déficit é calculado da pilha. [VERIFICADO EXECUTANDO A LÓGICA]
- **Percentis por posto mais próximo** (sem interpolar) e sugestão de duração só com 3+ amostras e desvio >= 25%; o previsto não entra na amostra (`time_source !== 'planned'`).
- **Hábito arquivado** só conta como agendado até o dia do arquivamento: não vira falha para sempre. [VERIFICADO EXECUTANDO A LÓGICA: 14 dias agendados, 7 feitos]
- **Categorias:** palavras inteiras evitam falso positivo ("ler" x "calendário"); a automática acompanha a renomeação; histórico por categoria soma itens e inclui arquivados (595 min = 21x20 + 7x25 conferidos). [VERIFICADO EXECUTANDO A LÓGICA]
- **Acessibilidade de base:** `Sheet` prende o Tab, fecha com Esc e devolve o foco a quem abriu; gráficos têm `tabindex`, setas/Home/End e uma tabela alternativa (`ColumnChart.vue:62,81-83,116-124`); botões só-ícone têm `aria-label` e `title`; `:focus-visible` definido (`style.css:46`). [INFERIDO DO CÓDIGO]
- **CSV protegido contra fórmula** (`backup.ts:10-14`) e backup validado antes de qualquer escrita (`parseBackup`).
- **Mensagens de validação** do formulário e dos Ajustes (duração, fuso, horário, minutos) são claras e em português.
- **Toast de "previsto"** ao concluir sem timer, com atalho "Ajustar tempo": ótima transparência sobre dado estimado.

## Alvos de toque (passo 15, só CSS) [INFERIDO DO CÓDIGO]
`style.css`: `.icon-btn` 44 px, inputs/botões 44 px (linhas 59-72) ok. Abaixo de 44 px: `.chips button` 40 px (linha 78: chips dos dias da semana e das abas), `.icon-btn.small` 36 px ("Desfazer" em Feitos hoje, linha 74), `.link` sem altura mínima (linha 252: "Detalhes", nome do item, relógio do timer, chip do tempo). Sem teste visual em 390/820/1280 px.

## Pendências (não verificado)
- Todo o comportamento visual e de foco real (Tab, Esc, leitura de rótulos) e o responsivo.
- Timer persistido ao recarregar (no demo os dados somem; no real o timer vive no banco por `timer_started_at`, `store.ts:166`).
- Cliques duplos reais, animação de saída e erros que só aparecem com latência.
