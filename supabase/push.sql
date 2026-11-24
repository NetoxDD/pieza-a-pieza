-- ============================================================
-- Notificaciones push: tablas, permisos y disparadores.
-- ANTES DE CORRER: cambia las dos líneas marcadas con  <<< EDITA
-- ============================================================

-- 1) Dónde está la función y la clave compartida con ella
create table if not exists public.push_config (key text primary key, value text not null);
alter table public.push_config enable row level security;   -- sin políticas: nadie la lee desde la app

insert into public.push_config (key, value) values
  ('function_url', 'https://zcjuzleiewnswapwomac.supabase.co/functions/v1/send-push'),   -- <<< EDITA (tu URL de Supabase + /functions/v1/send-push)
  ('secret',       'j1jh42g2n23n222j')                           -- <<< EDITA (la misma que pondrás como PUSH_SECRET en la función)
on conflict (key) do update set value = excluded.value;

-- 2) Dispositivos suscritos
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists push_subscriptions_own on public.push_subscriptions;
create policy push_subscriptions_own on public.push_subscriptions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3) Qué avisos quiere cada persona
create table if not exists public.notification_prefs (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  doses      boolean not null default true,
  events     boolean not null default true,
  messages   boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.notification_prefs enable row level security;
drop policy if exists notification_prefs_own on public.notification_prefs;
create policy notification_prefs_own on public.notification_prefs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 4) Registro de lo ya enviado (evita avisos repetidos). Solo lo usa la función.
create table if not exists public.push_log (
  key     text primary key,
  sent_at timestamptz not null default now()
);
alter table public.push_log enable row level security;

-- 5) Llamar a la función desde la base de datos
create extension if not exists pg_net with schema extensions;

create or replace function public.push_call(payload jsonb) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare u text; s text;
begin
  select value into u from public.push_config where key = 'function_url';
  select value into s from public.push_config where key = 'secret';
  if u is null or u like '%TU-PROYECTO%' or s is null then return; end if;   -- sin configurar: no hace nada
  perform net.http_post(
    url := u,
    body := payload,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', s),
    timeout_milliseconds := 5000
  );
exception when others then
  null;   -- un fallo de avisos nunca debe impedir guardar un mensaje
end $$;
revoke all on function public.push_call(jsonb) from public, anon, authenticated;

-- 6) Aviso cuando llega un mensaje nuevo
create or replace function public.push_on_message() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.push_call(jsonb_build_object(
    'kind', 'message',
    'record', jsonb_build_object('child_id', new.child_id, 'author_id', new.author_id)
  ));
  return new;
exception when others then
  return new;
end $$;
revoke all on function public.push_on_message() from public, anon, authenticated;

drop trigger if exists push_messages on public.messages;
create trigger push_messages after insert on public.messages
  for each row execute function public.push_on_message();

-- 7) Cada minuto la función revisa tomas y encuentros pendientes.
--    (Si da error en esta línea: en Supabase, Database > Extensions > activa «pg_cron» y vuelve a correr desde aquí.)
create extension if not exists pg_cron;
select cron.unschedule('push-tick') where exists (select 1 from cron.job where jobname = 'push-tick');
select cron.schedule('push-tick', '* * * * *', $$ select public.push_call('{"kind":"tick"}'::jsonb) $$);
