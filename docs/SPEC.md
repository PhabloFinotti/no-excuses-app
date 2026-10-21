# SPEC: no-excuses-app

App pessoal (S21+) para rastrear hábitos com alertas escalonados baseados no tempo restante até a hora de dormir.

## Requisitos
- R1. Cadastrar hábito: nome, duração (min), horário fixo opcional, dias da semana, prioridade (normal/essencial), `warn_min`/`urgent_min` opcionais.
- R2. Config global: hora de acordar e dormir (ex.: 07:00–23:00), limites padrão 30/10 min, fuso (America/Sao_Paulo).
- R3. Lista central do dia, com estado por hábito: normal / atenção / urgente / atrasado (cor; tremor em urgente).
- R4. Concluir com um toque em "feito".
- R5. Timer opcional por hábito; persistido no banco (`started_at` + acumulado). Restante = duração − decorrido.
- R6. Push escalonado: atenção (suave), urgente (som/vibração), atrasado ("não cabe tudo").
- R7. Alerta de déficit: quando a soma dos pendentes não cabe antes de dormir, mostra o déficit e sugere pular um hábito não essencial. Nunca pula automaticamente.
- R8. Histórico: um registro por hábito/dia (feito + tempo gasto); tela de histórico e estatísticas.
- R9. Auth e-mail+senha, 1 usuário, signup público desativado, RLS em tudo.
- R10. Tarefa avulsa (estilo Todoist): item com `kind=task` e `due_date` em vez de dias da semana; mesmos campos e comportamentos de um hábito (R1–R8). Não concluída no dia, rola para o próximo marcada como "atrasada de ontem" e entra no cálculo até ser concluída ou descartada.

## Regra de cálculo (agendamento reverso)
1. Hábitos fixos mantêm o horário.
2. Flexíveis pendentes são empilhados de trás pra frente a partir da hora de dormir.
3. Resultado: `limite_inicio` de cada hábito.
4. Nível pelo tempo até o limite: > warn = normal; <= warn = atenção; <= urgent = urgente; < 0 = atrasado.
5. Hábito fixo: limite = seu horário.

Exemplos (dormir 23:00, warn 15 nesses exemplos do enunciado original, padrão atual 30/10):
- Leitura 30 min: limite 22:30.
- Dois de 30 min: limites 22:00 e 22:30.

## Não-objetivos (MVP)
iOS, multiusuário, sync com calendário, recorrência além de dias da semana, descarte automático de hábitos.
