# No Excuses: visão completa do projeto

Documento autocontido para pedir novas sugestões e melhorias (a pessoas ou a uma IA). Descreve o que o app é, como funciona por dentro, o que já existe, o que ficou de fora de propósito e onde ainda dói.

## 1. O que é

Um app pessoal (1 usuário) para **hábitos recorrentes e tarefas avulsas**, usado principalmente num Samsung S21+ como **PWA instalado**. A ideia central: o app conhece a hora em que você acorda e a hora em que dorme, soma o tempo de tudo que falta fazer e **calcula o último momento em que cada item ainda pode começar**. A lista "Hoje" muda de cor e treme conforme esse limite se aproxima, e push notifications avisam em níveis crescentes.

Exemplo: dormir às 23:00, "Leitura" de 30 min, sem horário fixo. Limite para começar: 22:30. Com dois hábitos de 30 min, os limites viram 22:00 e 22:30 (empilhados de trás para frente).

Slogan do app: "Sem desculpas."

## 2. Stack

| Camada | Tecnologia |
|---|---|
| Front | Vue 3 (Composition API, `<script setup>`), TypeScript, Vite 8 |
| PWA | `vite-plugin-pwa` com `injectManifest` (`sw/sw.ts`, workbox-precaching) |
| Estado | Refs de módulo em `src/lib/store.ts` (sem Pinia) |
| Backend | Supabase: Postgres + RLS, Auth, Realtime, Edge Functions (Deno), `pg_cron` + `pg_net` |
| Push | Web Push com VAPID (`urgency: high`, TTL 600 s) |
| Integração | Google Agenda (OAuth próprio, escopo `calendar.app.created`) |
| Testes | Vitest (62 testes sobre a lógica pura) |
| Deploy | Vercel (front), Supabase (funções e banco), GitHub Actions (CI e deploy das funções) |
| Fonte | Bricolage Grotesque (títulos e números), sans do sistema no corpo |

Convenção: identificadores em inglês, comentários em português só quando necessário.

## 3. Funcionalidades

### Itens
- **Hábito**: nome, duração (min), horário fixo opcional, dias da semana, prioridade (normal/essencial), limites de alerta próprios (opcionais), arquivável.
- **Tarefa avulsa**: nome, duração, data de vencimento. Tarefa não concluída **rola para o dia seguinte**. Após 3 dias parada (`STALE_DAYS`), sai do cálculo e aparece em "Paradas há dias" com as ações "Fazer hoje" ou "Descartar".
- **Adição rápida** na tela Hoje: texto único tipo `Leitura 30`. Vira hábito diário ou tarefa de hoje.

### Tela "Hoje"
- Itens ordenados pelo prazo, em grupos **Agora** (atenção, urgente, atrasado), **Mais tarde** e **Feitos hoje**.
- Cada card: barra que esvazia com o tempo até o limite, cor e tremor por nível, timer, ações (feito, adiar 10 min, pular, abrir detalhes).
- Banner quando **não cabe tudo antes de dormir**: mostra o déficit e sugere o item a pular (essenciais são preservados).
- Confete ao concluir (e um maior ao fechar o dia), vibração curta, desfazer por toast.
- **Modo foco**: timer em tela cheia com wake lock.
- Onboarding de primeiro uso (notificações, bateria "Sem restrições" no Samsung, instalar o PWA).

### Tempo gasto
- Timer persistido no banco (`started_at` + acumulado), nunca só em memória.
- Concluir sem timer grava o **previsto** (`time_source = 'planned'`) e avisa, com atalho "Ajustar tempo". Fontes: `timer`, `manual`, `planned`. Tempos "planned" ficam fora de médias e sugestões.
- Folha de detalhes permite corrigir o tempo gasto de itens já feitos.

### Histórico e estatísticas
- Seletor de escopo: visão geral ou **um hábito específico**.
- Gráficos de colunas (feitos por dia), média móvel de 7 dias, minutos por dia, taxa por dia da semana, mapa de dias.
- Por hábito: taxa de cumprimento, sequência atual e melhor, tempo médio real vs previsto, **sugestão de ajustar a duração** (3+ medições e desvio ≥ 25%).
- Dias anteriores ao primeiro item cadastrado não contam como zero.

### Notificações (push)
- Níveis: **normal, atenção, urgente, atrasado**. Padrão 30 e 10 min antes do limite, ajustável globalmente e por hábito.
- Ações na notificação: **Feito** e **Adiar**; abrem o app com `?action=…&item=…`.
- **Resumo da manhã** (ao acordar) e **aviso do fim do dia** (X min antes de dormir), ambos desligáveis.
- Adiar silencia o item por 10 min.

### Google Agenda
- Só **tarefas** (hábitos não vão). Cria um calendário próprio "No Excuses"; o app não enxerga os outros calendários.
- Edição, conclusão (✓ no título) e exclusão acompanham. Botão "Enviar tarefas pendentes" faz sync em lote.
- Fallback simples: link "adicionar ao Google Agenda".

### Dados
- Exportar CSV (itens e conclusões, com proteção contra fórmulas), backup JSON, restaurar backup.
- Realtime: Hoje atualiza entre aparelhos sem recarregar.

### Ajustes
Horários de acordar e dormir, fuso (valida o IANA, botão "usar o do aparelho"), limites de atenção e urgente, tolerância de hábito com horário fixo (padrão 15 min), resumos, push, Google Agenda, dados, sair.

## 4. Como o núcleo funciona

### Cálculo de estado (`supabase/functions/_shared/calculateState.ts`)
Função **pura**, usada pela UI e pelo servidor (mesmo código, por isso os alertas e as cores nunca divergem; ver ADR 0002).

1. Itens com horário fixo ocupam blocos fixos.
2. Itens flexíveis pendentes são empilhados **de trás para frente** a partir da hora de dormir, desviando dos blocos fixos.
3. Resultado por item: `deadlineMin` ("último momento para começar") e `level`.
4. Se a soma não cabe: `deficitMin` e `suggestSkip`.
5. Hábito fixo que passou do horário tem tolerância (`fixed_grace_min`) antes de virar "atrasado".

### Scheduler stateless
- `pg_cron` chama a Edge Function `tick` a cada minuto (header `x-cron-secret`).
- `tick` roda `runTickJob`: para cada perfil, calcula o estado e decide quais pushes enviar.
- Dedupe pela tabela `notification_log(item_id, day, level)` com chave única. Se o envio falha, a linha é liberada para tentar de novo no minuto seguinte.
- Sem estado em memória: qualquer execução pode ser repetida com segurança.

### Conclusões
- `item_completions`: uma linha por item e dia (feito, pulado, tempo, fonte do tempo, timer, adiamento).
- Hábito: linha do dia. Tarefa: conclusão única lógica (`findCompletion` pega a mais recente de qualquer dia); tarefa vencida e feita hoje move a linha antiga.
- Atualizações **otimistas** na UI; um registro de escritas em andamento (`tracked`/`isWriting`) ignora o eco do Realtime.

## 5. Modelo de dados (Supabase)

Todas as tabelas com RLS `user_id = auth.uid()`; cadastro público desativado.

| Tabela | Papel |
|---|---|
| `profiles` | acordar, dormir, fuso, limites, tolerância, flags de resumo, `calendar_connected` (criado por trigger no signup) |
| `items` | hábitos e tarefas (`kind`, duração, horário fixo, `weekdays`, `due_date`, prioridade, limites próprios, arquivado) |
| `item_completions` | conclusões, pulos, timer, adiamento, `time_source` |
| `push_subscriptions` | assinaturas Web Push por aparelho |
| `notification_log` | dedupe dos pushes (limpeza semanal de linhas com mais de 30 dias) |
| `google_calendar_links` | refresh token (acesso só por service role) |
| `calendar_events` | mapa tarefa → evento do Google |

Constraints: duração ≤ 1440 min; `sleep_time > wake_time` (ambas `not valid`, não revalidam dados antigos). 9 migrações em `supabase/migrations/`.

## 6. Estrutura do repositório

```
src/
  App.vue                  shell, navegação (barra inferior no celular, lateral ≥ 1024 px), realtime
  views/                   Today, Items, History, Settings, Login
  components/              ItemCard, ItemSheet, ItemForm, Sheet, QuickAdd, FocusMode,
                           ColumnChart, OnboardingCard, Icon, BrandMark
  lib/                     store (estado e ações), stats, calendar, backup, push, quickAdd,
                           format, toast, confetti, supabase, demo (modo demo)
  style.css                tokens OKLCH e layout responsivo
sw/sw.ts                   service worker: precache, push, ações da notificação
supabase/
  functions/_shared/       lógica pura compartilhada (UI e Deno): calculateState, pending, time,
                           runTick, tickJob, summaries, push, calendarEvent, oauthState, google
  functions/tick           cron por minuto
  functions/push-test      push de teste
  functions/gcal-*         connect, callback (OAuth) e sync
  migrations/, cron.sql, config.toml
docs/                      SPEC, PLAN, TASKS, ROADMAP, SETUP, adr/ (0001 a 0004), este arquivo
.github/workflows/         ci.yml (testes, build, deno check) e deploy-supabase.yml
```

Scripts: `npm run dev`, `npm run dev:demo` (dados falsos, sem Supabase), `npm test`, `npm run build`.

## 7. Design e UX

- Modo "Operate": ferramenta de uso diário, escaneável, marca nos detalhes.
- Paleta grafite quente com acento brasa (tokens OKLCH); cores por nível de urgência.
- Barras de tempo com `transform: scaleX`; respeita `prefers-reduced-motion`.
- Responsivo: celular (barra inferior, folhas de baixo), desktop ≥ 1024 px (barra lateral, diálogos centrados ≥ 700 px, grids de gráficos e listas).
- Acessibilidade: foco preso nas folhas, Esc fecha, gráfico de colunas navegável por setas.
- Tela de login redesenhada.

## 8. Decisões já tomadas (não reabrir sem motivo)

- **PWA em vez de app nativo** (testar e publicar é mais simples; ADR 0001). Risco aceito: Web Push pode atrasar com Doze/economia de bateria da Samsung. Plano B: Capacitor.
- **Scheduler stateless por cron** (ADR 0002), **e-mail+senha com RLS** (ADR 0003), **item = hábito ou tarefa** (ADR 0004).
- Agendamento reverso a partir da hora de dormir; déficit só **avisa**, não pula sozinho.
- Google: escopo mínimo `calendar.app.created`, sem login com Google.
- Tarefa parada há mais de 3 dias sai do cálculo até você decidir.

## 9. Fora do escopo por enquanto

- Recorrência mensal e meta semanal ("3x por semana, dia livre").
- Subtarefas, etiquetas, projetos.
- Dias silenciosos por hábito (F2.7).
- App nativo / Capacitor (só se o atraso do push for ruim).
- Multiusuário, compartilhamento, i18n (só português do Brasil).
- Sync de hábitos para o calendário.

## 10. Estado atual e pendências

- Código e testes unitários prontos; build passa. **Pouco validado em aparelho real.** Os itens V1 a V13 de `docs/TASKS.md` (push no S21+, atraso, bateria, OAuth do Google etc.) ainda precisam ser conferidos.
- Setup do lado do usuário: aplicar migrações (`supabase db push`), publicar as funções, configurar segredos (VAPID, cron, Google), variáveis na Vercel, adicionar o próprio e-mail como usuário de teste no Google Cloud (app sem verificação).
- Problema em aberto: ícone do PWA no celular aparece como quadrado branco sobre vermelho (provável ícone antigo em cache do WebAPK; reinstalar o app após o deploy).

## 11. Limitações e pontos fracos conhecidos

- Push depende do FCM e da política de bateria do Android; sem garantia de horário exato.
- Cálculo considera um único dia (acordar/dormir no mesmo dia). Quem dorme depois da meia-noite não é suportado (há constraint `sleep_time > wake_time`).
- Um único perfil de rotina; sem rotina diferente para fim de semana.
- Item flexível é empilhado sem considerar energia, contexto ou ordem preferida.
- Sem modo offline completo para escrita (o app precisa de rede para gravar).
- Estatísticas são recalculadas no cliente com todos os dados carregados; vale para 1 usuário, não escala para anos de histórico sem paginação.
- Sem notificação de "conseguiu" (reforço positivo) além do confete na tela.
- Google: app em modo de teste, tokens podem expirar em 7 dias se o consentimento não for publicado.

## 12. Onde buscar sugestões

Áreas em que novas ideias são bem-vindas, com a restrição de manter o app simples e de uso individual:

1. **Confiabilidade do alerta**: alternativas ao Web Push puro, estratégias para a Samsung, fallback quando a notificação atrasa.
2. **Modelo de recorrência**: mensal, "N vezes por semana", intervalos ("a cada 3 dias"), pausas e férias.
3. **Rotina**: horários diferentes por dia da semana, dormir depois da meia-noite, blocos de indisponibilidade (trabalho, aulas).
4. **Motivação**: sequências, metas, resumo semanal, reforço positivo, revisão semanal automática.
5. **Planejamento**: sugestão de melhor ordem do dia, encaixe automático de tarefas, estimativa que aprende com o histórico.
6. **Integrações**: Google Agenda de mão dupla, widgets, atalhos do Android, Tasker, exportação para Notion/Sheets.
7. **Estatísticas**: correlações, heatmap anual, comparação entre semanas, insights em texto.
8. **UX**: gestos (arrastar para concluir), modo escuro/claro explícito, acessibilidade, microinterações.
9. **Engenharia**: testes de ponta a ponta, observabilidade das funções, custo e limites do Supabase, performance com muito histórico.

Ao sugerir, indique: qual problema resolve, esforço (S/M/L), mudanças no modelo de dados e se mexe no cálculo de estado (que exige atualizar UI e `tick` juntos).
