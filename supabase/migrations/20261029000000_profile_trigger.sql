-- O perfil passa a ser criado quando a conta nasce, em vez de o app tentar criá-lo (uma escrita) a cada carregamento.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Contas que já existiam.
insert into public.profiles (user_id) select id from auth.users on conflict do nothing;
