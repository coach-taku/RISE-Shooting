-- =====================================================
-- RISE Shooting デモ用シードデータ
-- =====================================================
-- 【実行方法】
--   Supabase ダッシュボード > Authentication > Users から
--   下記3名のアカウントを手動で作成してください。
--   または、後述のSupabase Admin API（SQL方式）を使用してください。
--
-- 【デモアカウント一覧】
--   ログイン画面での表示名  |  内部メールアドレス（直接入力不要）  |  合言葉
--   コーチ山田（コーチ）    |  yamada@rise-shooting.example.com           |  rise2024
--   選手佐藤（選手）        |  sato@rise-shooting.example.com             |  rise2024
--   選手鈴木（選手）        |  suzuki@rise-shooting.example.com           |  rise2024
--
-- 【ログイン方法】
--   ユーザーはアプリのログイン画面で「名前プルダウン」から選択し、
--   「合言葉」を入力するだけでログインできます。
--   メールアドレスの入力は不要です。
-- =====================================================

-- =====================================================
-- 方法A: Supabase Dashboard から手動作成（推奨・簡単）
-- =====================================================
-- 1. Supabase ダッシュボードを開く
-- 2. Authentication > Users > "Add user" をクリック
-- 3. 以下の3名を順番に登録する：
--
--    Email: yamada@rise-shooting.example.com
--    Password: rise2024
--
--    Email: sato@rise-shooting.example.com
--    Password: rise2024
--
--    Email: suzuki@rise-shooting.example.com
--    Password: rise2024
--
-- 4. ユーザー作成後、profiles テーブルのロールと表示名を
--    下記「方法B」のSQLで設定してください。

-- =====================================================
-- 方法B: profiles テーブルの初期データ設定（SQL Editor で実行）
-- ※ 方法Aで auth.users にユーザーを作成した後に実行してください
-- =====================================================

-- コーチ山田の profiles を設定（auth.users から uuid を取得して更新）
update public.profiles
set username = 'コーチ山田', role = 'coach'
where id = (select id from auth.users where email = 'yamada@rise-shooting.example.com');

-- 選手佐藤の profiles を設定
update public.profiles
set username = '選手佐藤', role = 'player'
where id = (select id from auth.users where email = 'sato@rise-shooting.example.com');

-- 選手鈴木の profiles を設定
update public.profiles
set username = '選手鈴木', role = 'player'
where id = (select id from auth.users where email = 'suzuki@rise-shooting.example.com');

-- =====================================================
-- 方法C: Supabase Admin API 経由で一括作成（上級者向け）
-- Service Role Key が必要
-- =====================================================
-- curl コマンド例（ターミナルから実行）:
--
-- SUPABASE_URL="https://your-project.supabase.co"
-- SERVICE_KEY="your-service-role-key"
--
-- # コーチ山田
-- curl -X POST "$SUPABASE_URL/auth/v1/admin/users" \
--   -H "apikey: $SERVICE_KEY" \
--   -H "Authorization: Bearer $SERVICE_KEY" \
--   -H "Content-Type: application/json" \
--   -d '{"email":"yamada@rise-shooting.example.com","password":"rise2024","email_confirm":true,"user_metadata":{"username":"コーチ山田","role":"coach"}}'
--
-- # 選手佐藤
-- curl -X POST "$SUPABASE_URL/auth/v1/admin/users" \
--   -H "apikey: $SERVICE_KEY" \
--   -H "Authorization: Bearer $SERVICE_KEY" \
--   -H "Content-Type: application/json" \
--   -d '{"email":"sato@rise-shooting.example.com","password":"rise2024","email_confirm":true,"user_metadata":{"username":"選手佐藤","role":"player"}}'
--
-- # 選手鈴木
-- curl -X POST "$SUPABASE_URL/auth/v1/admin/users" \
--   -H "apikey: $SERVICE_KEY" \
--   -H "Authorization: Bearer $SERVICE_KEY" \
--   -H "Content-Type: application/json" \
--   -d '{"email":"suzuki@rise-shooting.example.com","password":"rise2024","email_confirm":true,"user_metadata":{"username":"選手鈴木","role":"player"}}'

-- =====================================================
-- 確認用クエリ
-- =====================================================
-- select id, email from auth.users where email like '%@rise-shooting.example.com';
-- select * from public.profiles;
