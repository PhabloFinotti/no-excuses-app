# ADR 0002: scheduler stateless por minuto

Decisão: `pg_cron` por minuto chama Edge Function que recalcula tudo do zero com `calcularEstado`; `notification_log(habit_id, day, level)` único evita duplicados.
Motivo: sem fila para cancelar/reagendar; concluir um hábito já o tira do próximo cálculo; mesma função pura da UI, então tela e push não divergem; fácil de testar.
Descartado: fila agendada (exige reagendar em todo evento).
Custo: uma execução por minuto, cabe no plano gratuito para um usuário.
