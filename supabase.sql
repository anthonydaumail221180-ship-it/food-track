-- À coller dans Supabase : menu « SQL Editor » > New query > Run
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  lat double precision not null,
  lng double precision not null,
  address text not null,
  stars int not null default 0 check (stars between 0 and 5),
  photo text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  ts timestamptz not null default now(),
  validated_at timestamptz
);
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('truck','news')),
  title text not null,
  body text not null default '',
  ts timestamptz not null default now()
);
-- Sécurité : personne ne peut lire ces tables directement depuis un navigateur, seul notre serveur y accède.
alter table reports enable row level security;
alter table posts enable row level security;
insert into posts (kind, title, body) values ('news', 'Bienvenue sur LëtzTrack !', 'Le fil d''actu vous annonce chaque nouveau food truck et les nouveautés de la plateforme.');
