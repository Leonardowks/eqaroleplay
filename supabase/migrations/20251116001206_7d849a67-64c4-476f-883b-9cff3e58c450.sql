-- Create profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Profiles policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Create personas table
create table public.personas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  company text not null,
  sector text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  description text,
  avatar_url text,
  personality_traits jsonb,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.personas enable row level security;

-- Personas are public (everyone can read)
create policy "Anyone can view personas"
  on public.personas for select
  to authenticated
  using (true);

-- Create roleplay sessions table
create table public.roleplay_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  persona_id uuid references public.personas(id) not null,
  meeting_type text not null check (meeting_type in ('prospection', 'discovery', 'presentation', 'negotiation')),
  method text not null check (method in ('voice', 'text')),
  duration_seconds integer default 0,
  overall_score decimal(3,1),
  status text default 'active' check (status in ('active', 'completed')),
  started_at timestamptz default now(),
  completed_at timestamptz
);

-- Enable RLS
alter table public.roleplay_sessions enable row level security;

-- Sessions policies
create policy "Users can view their own sessions"
  on public.roleplay_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own sessions"
  on public.roleplay_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own sessions"
  on public.roleplay_sessions for update
  using (auth.uid() = user_id);

-- Create session messages table
create table public.session_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.roleplay_sessions(id) on delete cascade not null,
  role text not null check (role in ('user', 'persona')),
  content text not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.session_messages enable row level security;

-- Messages policies (users can only see messages from their own sessions)
create policy "Users can view messages from their sessions"
  on public.session_messages for select
  using (
    exists (
      select 1 from public.roleplay_sessions
      where id = session_id and user_id = auth.uid()
    )
  );

create policy "Users can insert messages to their sessions"
  on public.session_messages for insert
  with check (
    exists (
      select 1 from public.roleplay_sessions
      where id = session_id and user_id = auth.uid()
    )
  );

-- Create competency scores table
create table public.competency_scores (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.roleplay_sessions(id) on delete cascade not null,
  competency_name text not null,
  score decimal(3,1) not null check (score >= 0 and score <= 10),
  feedback text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.competency_scores enable row level security;

-- Scores policies
create policy "Users can view scores from their sessions"
  on public.competency_scores for select
  using (
    exists (
      select 1 from public.roleplay_sessions
      where id = session_id and user_id = auth.uid()
    )
  );

create policy "Users can insert scores to their sessions"
  on public.competency_scores for insert
  with check (
    exists (
      select 1 from public.roleplay_sessions
      where id = session_id and user_id = auth.uid()
    )
  );

-- Trigger for updating updated_at on profiles
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

-- Trigger to create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();