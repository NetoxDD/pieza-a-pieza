-- 1) Cuarto tema (coral) y 2) vista sencilla. Corre esto ANTES de subir el código.
alter table public.user_settings add column if not exists simple_view boolean not null default false;

alter table public.user_settings drop constraint if exists user_settings_palette_ck;
alter table public.user_settings
  add constraint user_settings_palette_ck check (palette in ('calida','clara','ludica','coral'));
