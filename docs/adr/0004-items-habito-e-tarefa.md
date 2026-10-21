# ADR 0004: hábito e tarefa avulsa na mesma entidade `items`

Decisão: uma tabela `items` com `kind` (`habit`|`task`); recorrência por `weekdays[]` (hábito) ou `due_date` (tarefa). Tarefa vencida e não concluída rola para o dia seguinte até ser concluída ou descartada.
Motivo: tarefa tem os mesmos atributos e alertas de um hábito; `calculateState` e o scheduler (ADR 0002) ficam iguais.
Descartado: tabela `tasks` separada (duplicaria CRUD, timer, alertas); expirar no fim do dia (esquece tarefas importantes).
