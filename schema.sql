-- =========================================================
-- CloudTasks - Esquema de base de datos (Supabase / PostgreSQL)
-- Basado en el modelo ER: USER -> TASK -> (PERSONAL_TASK | TEAM_TASK)
-- =========================================================
-- Ejecutar este script completo en el SQL Editor de Supabase.

-- ---------------------------------------------------------
-- 1) PROFILES (extiende auth.users -> entidad USER del modelo)
-- ---------------------------------------------------------
-- Supabase ya maneja el login (auth.users: id, email, password
-- cifrado). No se guarda el password en texto plano en ninguna
-- tabla propia: eso sería inseguro. "profiles" cubre username +
-- email como datos visibles de USER, referenciando el id real
-- del usuario autenticado.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Los perfiles son visibles para cualquier usuario autenticado"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Un usuario solo edita su propio perfil"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Trigger: al registrarse un usuario en auth.users, se crea
-- automáticamente su fila en profiles usando el username
-- enviado en el registro (user_metadata).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------
-- 2) TEAMS y TEAM_MEMBERS (soporte para TEAM_TASK)
-- ---------------------------------------------------------
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;

create policy "Miembros ven sus equipos"
  on public.teams for select to authenticated
  using (
    owner_id = auth.uid()
    or exists (select 1 from public.team_members tm where tm.team_id = id and tm.user_id = auth.uid())
  );

create policy "Cualquier usuario autenticado crea un equipo"
  on public.teams for insert to authenticated
  with check (owner_id = auth.uid());

create policy "Miembros ven la membresía de sus equipos"
  on public.team_members for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid())
  );

create policy "El dueño del equipo agrega miembros"
  on public.team_members for insert to authenticated
  with check (
    exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid())
  );

-- ---------------------------------------------------------
-- 3) TASKS (TASK + discriminador PERSONAL_TASK / TEAM_TASK)
-- ---------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  planned_date date,
  due_date date,
  priority text not null default 'media' check (priority in ('baja', 'media', 'alta')),
  task_type text not null check (task_type in ('personal', 'equipo')),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  constraint team_task_requires_team
    check (
      (task_type = 'personal' and team_id is null)
      or (task_type = 'equipo' and team_id is not null)
    )
);

alter table public.tasks enable row level security;

create policy "Ver tareas personales propias o de equipos donde soy miembro"
  on public.tasks for select to authenticated
  using (
    (task_type = 'personal' and owner_id = auth.uid())
    or (task_type = 'equipo' and exists (
      select 1 from public.team_members tm
      where tm.team_id = tasks.team_id and tm.user_id = auth.uid()
    ))
  );

create policy "Crear tareas propias (personales o de un equipo del que soy miembro)"
  on public.tasks for insert to authenticated
  with check (
    owner_id = auth.uid()
    and (
      (task_type = 'personal' and team_id is null)
      or (task_type = 'equipo' and exists (
        select 1 from public.team_members tm
        where tm.team_id = tasks.team_id and tm.user_id = auth.uid()
      ))
    )
  );

create policy "Actualizar tareas personales propias o de equipo donde soy miembro"
  on public.tasks for update to authenticated
  using (
    (task_type = 'personal' and owner_id = auth.uid())
    or (task_type = 'equipo' and exists (
      select 1 from public.team_members tm
      where tm.team_id = tasks.team_id and tm.user_id = auth.uid()
    ))
  );

create policy "Eliminar tareas personales propias o de equipo donde soy miembro"
  on public.tasks for delete to authenticated
  using (
    (task_type = 'personal' and owner_id = auth.uid())
    or (task_type = 'equipo' and exists (
      select 1 from public.team_members tm
      where tm.team_id = tasks.team_id and tm.user_id = auth.uid()
    ))
  );

-- Índices útiles
create index if not exists idx_tasks_owner on public.tasks(owner_id);
create index if not exists idx_tasks_team on public.tasks(team_id);
create index if not exists idx_team_members_user on public.team_members(user_id);
