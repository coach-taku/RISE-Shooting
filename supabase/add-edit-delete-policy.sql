-- =====================================================
-- v8: 過去データの修正・削除機能のための RLS ポリシー確認・追加
-- 
-- 確認結果:
--   - records_delete_own (DELETE) は schema.sql に既に存在するため追加不要
--   - records_insert_own (INSERT) は schema.sql に既に存在するため追加不要
--   - 今回の修正実装は「既存レコード削除 → 新規 INSERT」方式のため UPDATE ポリシーは不要
--
-- 念のため、将来 UPDATE 方式に切り替える場合に備えて
-- shooting_records テーブルへの UPDATE ポリシーを用意します。
-- ※ 現時点では適用不要ですが、必要になった際は以下を Supabase SQL Editor で実行してください。
-- =====================================================

-- shooting_records: 自分のレコードのみ更新可能（将来用）
-- 現在の実装では使用しないが、直接 UPDATE が必要になった際に有効化してください
create policy "records_update_own"
  on public.shooting_records for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- =====================================================
-- 既存ポリシーの確認クエリ（実行後に確認できます）
-- =====================================================
-- select schemaname, tablename, policyname, cmd, qual
-- from pg_policies
-- where tablename = 'shooting_records'
-- order by cmd;
