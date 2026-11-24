-- Temas nuevos: calida | clara | ludica (reemplazan las paletas anteriores).
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.user_settings'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%palette%'
  loop
    execute format('alter table public.user_settings drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.user_settings alter column palette set default 'calida';
update public.user_settings set palette = case palette when 'oceano' then 'clara' else 'calida' end
  where palette not in ('calida','clara','ludica');
alter table public.user_settings
  add constraint user_settings_palette_ck check (palette in ('calida','clara','ludica'));
