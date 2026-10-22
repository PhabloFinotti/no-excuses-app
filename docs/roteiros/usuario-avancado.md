# Roteiro 2: usuário arrojado

**Perfil:** usa o app todo dia, tem 20+ itens, de hábitos e tarefas a categorias e estudo. Quer velocidade, controle e dados confiáveis. Tem pouca paciência para cliques desnecessários e percebe inconsistências.

**Rigor:** além de usabilidade e UI, procure bugs, estados estranhos, perda de dados, números que não batem e cenários limite. Para cada achado, diga como reproduzir.

## Cenário
Modo demo, com itens e histórico. Você vai exercitar todos os recursos.

## Passos
1. **Cálculo do dia.** Na tela Hoje, confira se os limites de "começar até" fazem sentido: some as durações dos itens flexíveis e compare com a hora de dormir. Há item com horário fixo? Ele respeita o horário?
2. **Déficit e recuperação.** Crie itens suficientes para não caber antes de dormir (por exemplo, três de 60 min). O banner aparece? A sugestão de pular faz sentido? O botão "Pular" pula todos os sugeridos e o desfazer reverte tudo?
3. **Adição rápida com duração no texto.** Teste: `Ler por 60 minutos`, `Estudar Kubernetes 1h30`, `Estudar DSA por 2 horas`, `Correr 40 min`, `Ler 10 páginas`, `Treino 2 20`, `Ler 25h`, `45`, texto vazio, nome enorme. Confira nome, duração e categoria resultantes.
4. **Categorias.** Crie "Leitura", "Ler", "Ler livro tal", "Estudar Kubernetes", "Estudar DSA", "Meditar", "Pagar conta de luz", "Xablau". Veja as categorias automáticas na lista e nos cards. Troque manualmente uma e use "Sem categoria". Renomeie um item automático e veja se a categoria acompanha. Use o filtro por categoria em Itens.
5. **Formulário completo.** Horário fixo, dias da semana (desmarque todos), essencial, limites próprios de atenção e urgente (valores estranhos: 0, negativo, maior que a duração), duração 0 e 1441.
6. **Timer e tempo.** Inicie, pause, feche e reabra a página: o timer sobreviveu? Abra os detalhes e corrija o tempo. Conclua sem timer e use "Ajustar tempo". Modo foco: abre, fecha, conclui.
7. **Concluir, desfazer, pular e adiar rápido e em sequência** no mesmo item (toques repetidos). O estado final é coerente? Aparece erro ou card duplicado?
8. **Criação em duplicidade.** Dê Enter duas vezes rápido no formulário e na adição rápida (aba Itens e botão "+"). Quantos itens foram criados? Deveria ser um.
9. **Tarefas.** Tarefa vencida há 1 dia (rolada) e há 4 dias (parada): como aparecem? "Fazer hoje" e "Descartar" funcionam? Conclua uma tarefa rolada.
10. **Histórico.** Troque 7/30/90 dias. Escopo "Todos", uma categoria e um hábito. Confira: números dos gráficos, média de 7 dias, P50/P80, sugestão de ajustar duração, calendário, sequência. Há algo incoerente entre os escopos? Os rótulos e legendas ajudam?
11. **Itens arquivados no histórico.** Arquive um hábito com histórico. Ele some do histórico por categoria? Passa a contar como falha?
12. **Ajustes.** Horários inválidos (dormir antes de acordar), fuso inexistente, minutos negativos: as mensagens de erro são claras? Exportar CSV e backup; restaurar backup. Diagnóstico de push ("Verificar situação"): o texto é compreensível?
13. **Google Agenda.** Qual é o estado exibido sem credenciais? A explicação é clara?
14. **Teclado e acessibilidade.** Navegue só com Tab: ordem de foco, foco visível, Esc fecha folhas, gráficos por setas. Leia os rótulos de botões só com ícone.
15. **Responsivo.** 390, 820 e 1280 px: algo corta, sobrepõe, exige rolagem horizontal ou fica pequeno demais para o toque (mínimo 44 px)?
16. **Atrito de uso diário.** Quantos toques para: concluir um item, adicionar um item, ver o histórico de um hábito, corrigir um tempo? O que você automatizaria ou atalharia?

## Entregue
Relatório com: (a) bugs com passos para reproduzir e gravidade, (b) inconsistências de números ou textos, (c) fluxos que poderiam ter menos cliques, (d) ações ou botões ambíguos com sugestão, (e) recursos que faltam para quem usa muito, (f) o que está excelente.
