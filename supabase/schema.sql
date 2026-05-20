-- =====================================================
-- RISE Shooting アプリ データベーススキーマ
-- Supabase SQL Editor にそのまま貼り付けて実行してください
-- =====================================================

-- =====================================================
-- 1. profiles テーブル（選手・コーチのプロフィール情報）
-- Supabase Auth の auth.users と連携する
-- =====================================================
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text not null unique,         -- 表示名（選手名・コーチ名）
  role text not null default 'player'    -- 権限: 'player' または 'coach'
    check (role in ('player', 'coach')),
  -- コーチが管理画面で選手のパスワードを確認するための表示用カラム（平文）
  -- 実際の認証は Supabase Auth が担当。認証パスワードは入力値 + '__rise' サフィックス。
  -- ※ Supabase ダッシュボードでこのカラムを直接書き換えても Supabase Auth には反映されません。
  --   パスワード変更は必ずアプリの管理画面（M-02）から行ってください。
  password_plain text,
  created_at timestamptz not null default now()
);

-- RLS（行レベルセキュリティ）を有効化
alter table public.profiles enable row level security;

-- 全ユーザーが全プロフィールを閲覧可能（ランキング表示のため）
create policy "profiles_select_all"
  on public.profiles for select
  to authenticated
  using (true);

-- 自分自身のプロフィールのみ更新可能
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- =====================================================
-- 2. shooting_records テーブル（シューティング記録）
-- =====================================================
create table if not exists public.shooting_records (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null default current_date,                 -- 記録日
  area_name text not null,                                  -- エリア名
  attempts integer not null default 10                      -- 試投数（10本単位）
    check (attempts > 0 and attempts % 10 = 0),
  successes integer not null                                -- 成功数
    check (successes >= 0 and successes <= attempts),
  created_at timestamptz not null default now()
);

-- RLS を有効化
alter table public.shooting_records enable row level security;

-- 全認証済みユーザーが全記録を閲覧可能（ランキング・ダッシュボード表示のため）
create policy "records_select_all"
  on public.shooting_records for select
  to authenticated
  using (true);

-- 自分の記録のみ登録可能
create policy "records_insert_own"
  on public.shooting_records for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- 自分の記録のみ削除可能
create policy "records_delete_own"
  on public.shooting_records for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- =====================================================
-- 3. インデックス（パフォーマンス向上）
-- =====================================================
create index if not exists idx_shooting_records_user_id
  on public.shooting_records(user_id);

create index if not exists idx_shooting_records_date
  on public.shooting_records(date);

create index if not exists idx_shooting_records_user_date
  on public.shooting_records(user_id, date);

-- =====================================================
-- 4. 新規ユーザー登録時に profiles を自動作成するトリガー
-- =====================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  -- 新規ユーザー登録時に profiles レコードを自動作成する
  -- password_plain は create-player API が後から UPDATE するため、ここでは NULL のままにする
  insert into public.profiles (id, username, role, password_plain)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'player'),
    null  -- パスワード平文は create-player / update-player API が設定する
  );
  return new;
end;
$$;

-- 既存のトリガーがあれば削除してから再作成
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================================================
-- 5. コーチ用：パスワードリセット機能（Service Role Key が必要）
-- Supabase Admin API を利用するため、フロントから直接呼ばない
-- =====================================================

-- =====================================================
-- 確認用クエリ（実行後に確認してください）
-- =====================================================
-- select * from public.profiles;
-- select * from public.shooting_records;
