-- Resultado do último envio por aparelho, para a tela de diagnóstico em Ajustes (o cliente lê via a policy own_push).
alter table push_subscriptions
  add column last_ok_at timestamptz,
  add column last_error text,
  add column last_error_at timestamptz;
