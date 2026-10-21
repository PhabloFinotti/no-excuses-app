# ADR 0003: auth e-mail+senha, 1 usuário, RLS

Decisão: Supabase Auth e-mail+senha; signup público desativado após criar a conta; RLS `user_id = auth.uid()` em todas as tabelas.
Motivo: a chave `anon` fica no front-end, então sem auth+RLS qualquer um com a URL leria/apagaria os dados; o `user_id` também liga a push subscription ao usuário. Modelo já serve para multiusuário.
Descartado: magic link (depende de e-mail a cada login), sem auth.
