# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
O dono do app e pessoas próximas (família, amigos), cada um com a própria conta. Usam no celular Android, como PWA instalado, várias vezes ao dia: de manhã para ver o dia, ao longo do dia para marcar o que fizeram e responder aos avisos, e à noite para fechar o dia. Quem entra não necessariamente conhece o app: o primeiro uso e o cadastro de itens precisam se explicar sozinhos.

## Product Purpose
Manter hábitos recorrentes e tarefas avulsas em dia sabendo exatamente até quando cada um ainda dá para começar. O app conhece a hora de acordar e de dormir, soma o que falta e calcula o último momento para começar cada item; avisa em níveis crescentes por push. Sucesso: fechar o dia com tudo feito, ou decidir conscientemente o que pular, sem descobrir tarde demais que não cabia.

## Positioning
Agendamento reverso a partir da hora de dormir: em vez de uma lista com horários, cada item tem um prazo calculado que se move conforme o resto do dia anda ("não cabe tudo antes de dormir: faltam 40 min; sugestão: pular X"). Itens que se repetem no dia (colírio 5x, a cada 2h) seguem a última vez registrada. O app cobra sem desculpas e não pula nada sozinho.

## Operating Context
- PWA no Android (Samsung S21+ é o aparelho principal), desktop eventual (layout com barra lateral a partir de 1024 px).
- Push com ações "Feito" e "Adiar 10 min"; resumo da manhã e aviso antes de dormir.
- Uso em momentos curtos: olhar, tocar em "Feito", fechar. O cadastro acontece com menos frequência, mas é a porta de entrada de quem começa.
- Português do Brasil apenas.

## Capabilities and Constraints
- Itens: hábito (dias da semana, horário fixo opcional, duração, essencial, emoji, data de fim) e tarefa avulsa (data, rola para o dia seguinte; parada há mais de 3 dias pede decisão). Item repetido no dia: vezes por dia, intervalo, primeiro aviso, sem duração.
- Tela Hoje agrupada em Agora / Mais tarde / Feitos hoje; timer persistido no banco; modo foco; pular, adiar, desfazer por toast; adição rápida em texto ("Ler 30").
- Histórico: cumprimento, sequências, tempo real vs estimado, vezes por dia, calendário, categorias fixas com emoji.
- Supabase (Postgres + RLS por usuário, Realtime, Edge Functions, cron por minuto), Vue 3 + Vite, Google Agenda só para tarefas.
- Regra do motor: a UI e o `tick` usam a mesma função pura de cálculo; mudanças no estado exigem os dois juntos (docs/adr/0002).
- Em aberto: como novas contas são criadas (hoje o cadastro público está desligado e as contas são criadas à mão).

## Brand Commitments
- Nome "No Excuses", slogan "Sem desculpas."
- Voz firme e direta quando algo atrasa ou não cabe; celebra de verdade quando a pessoa cumpre (fechar o dia, bater a meta, manter a sequência). Nunca culpa nem dá sermão; erros dizem o que aconteceu e como resolver.
- Referência de experiência citada pelo dono: Duolingo (cadastro e progresso amigáveis, recompensa ao cumprir).
- Direção visual escolhida pelo dono (20/11/2026): o padrão dos apps de hábito, executado com capricho e melhorado a partir dele; a régua de acabamento é Duolingo e Todoist. A identidade anterior (grafite quente com laranja-brasa) foi aposentada.

## Evidence on Hand
Sem usuários externos, depoimentos ou métricas. Dados reais só do próprio uso; o modo demo (`npm run dev:demo`) gera dados falsos para testar a UI. Não inventar números, conquistas ou depoimentos.

## Product Principles
- O prazo é a informação principal: o que fazer agora vem antes de qualquer outra coisa.
- Marcar como feito é um toque; tudo o mais é secundário e pode esperar.
- Cadastrar é uma conversa curta, não um formulário: pergunte o essencial, deduza o resto e deixe ajustar depois.
- Cobrar com firmeza, comemorar com generosidade: o progresso tem que ser sentido, não só calculado.
- Nada acontece sozinho às escondidas: o app sugere (pular, ajustar duração), a pessoa decide.
