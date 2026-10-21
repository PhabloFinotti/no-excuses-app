-- Adiar: o tick fica mudo até snoozed_until e depois manda um lembrete (marcado em snooze_notified_for).
alter table item_completions
  add column snoozed_until timestamptz,
  add column snooze_notified_for timestamptz;
