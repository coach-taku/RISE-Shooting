-- =====================================================
-- デモユーザー 強制リセット SQL
-- =====================================================
-- 【用途】
--   ログインが 401 エラーで失敗する場合に使用します。
--   auth.users のパスワードと profiles を確実に正しい状態にします。
--
-- 【実行場所】
--   Supabase ダッシュボード > SQL Editor > New query に貼り付けて実行
--
-- 【対象ユーザー】
--   コーチ山田: yamada@demo.risenote.com / rise2024
--   選手佐藤:   sato@demo.risenote.com   / rise2024
--   選手鈴木:   suzuki@demo.risenote.com / rise2024
-- =====================================================


-- =====================================================
-- ステップ1: 現在の状態確認（実行前に必ずこれを先に実行）
-- =====================================================
select
  u.id,
  u.email,
  u.email_confirmed_at,
  u.created_at,
  p.username,
  p.role
from auth.users u
left join public.profiles p on p.id = u.id
where u.email in (
  'yamada@demo.risenote.com',
  'sato@demo.risenote.com',
  'suzuki@demo.risenote.com'
);


-- =====================================================
-- ステップ2: パスワードを rise2024 に強制リセット
-- ※ Supabase の pgcrypto 拡張を使用してハッシュを生成
-- =====================================================

-- コーチ山田のパスワードリセット
update auth.users
set
  encrypted_password = crypt('rise2024', gen_salt('bf')),
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  updated_at = now()
where email = 'yamada@demo.risenote.com';

-- 選手佐藤のパスワードリセット
update auth.users
set
  encrypted_password = crypt('rise2024', gen_salt('bf')),
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  updated_at = now()
where email = 'sato@demo.risenote.com';

-- 選手鈴木のパスワードリセット
update auth.users
set
  encrypted_password = crypt('rise2024', gen_salt('bf')),
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  updated_at = now()
where email = 'suzuki@demo.risenote.com';


-- =====================================================
-- ステップ3: profiles テーブルを修復
-- （username と role が正しく設定されているか確認・修正）
-- =====================================================

-- コーチ山田
insert into public.profiles (id, username, role)
select id, 'コーチ山田', 'coach'
from auth.users
where email = 'yamada@demo.risenote.com'
on conflict (id) do update
  set username = 'コーチ山田', role = 'coach';

-- 選手佐藤
insert into public.profiles (id, username, role)
select id, '選手佐藤', 'player'
from auth.users
where email = 'sato@demo.risenote.com'
on conflict (id) do update
  set username = '選手佐藤', role = 'player';

-- 選手鈴木
insert into public.profiles (id, username, role)
select id, '選手鈴木', 'player'
from auth.users
where email = 'suzuki@demo.risenote.com'
on conflict (id) do update
  set username = '選手鈴木', role = 'player';


-- =====================================================
-- ステップ4: 修復後の状態確認（ステップ2・3実行後に使用）
-- =====================================================
select
  u.id,
  u.email,
  case when u.email_confirmed_at is not null then '認証済み' else '未認証' end as メール認証,
  p.username,
  p.role
from auth.users u
left join public.profiles p on p.id = u.id
where u.email in (
  'yamada@demo.risenote.com',
  'sato@demo.risenote.com',
  'suzuki@demo.risenote.com'
);
