-- =====================================================
-- 努力量ランキング集計用 RPC (ストアドプロシージャ)
-- =====================================================
-- 背景:
--   フロントエンドから shooting_records を全件取得して集計する方式では、
--   Supabaseのデフォルト上限(1,000件)を超えたレコードが取得漏れとなり、
--   総試投数が実際より少なく表示されてしまう不具合が発生していた。
--   本RPCでデータベース側で集計することで、全件を正確に集計できるようになる。
--
-- 使用方法:
--   Supabase の SQL Editor にこのファイルの内容を貼り付けて実行してください。
--   その後、フロントエンドから supabase.rpc('get_player_effort_ranking') で呼び出せます。
-- =====================================================

-- =====================================================
-- 1. ビュー: v_player_shooting_totals
--    選手ごとの総試投数・総成功数を集計するビュー
-- =====================================================
create or replace view public.v_player_shooting_totals as
  select
    p.id                            as user_id,
    p.username,
    coalesce(sum(r.attempts), 0)    as total_attempts,
    coalesce(sum(r.successes), 0)   as total_successes,
    count(r.id)                     as record_count
  from
    public.profiles p
    left join public.shooting_records r on r.user_id = p.id
  where
    p.role = 'player'
  group by
    p.id, p.username
  order by
    total_attempts desc;

-- =====================================================
-- 2. RPC 関数: get_player_effort_ranking
--    努力量ランキング（総試投数降順）を返す関数
--    フロントエンドから supabase.rpc('get_player_effort_ranking') で呼び出す
-- =====================================================
create or replace function public.get_player_effort_ranking()
returns table (
  user_id        uuid,
  username       text,
  total_attempts bigint,
  total_successes bigint,
  record_count   bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id                            as user_id,
    p.username,
    coalesce(sum(r.attempts), 0)    as total_attempts,
    coalesce(sum(r.successes), 0)   as total_successes,
    count(r.id)                     as record_count
  from
    public.profiles p
    left join public.shooting_records r on r.user_id = p.id
  where
    p.role = 'player'
  group by
    p.id, p.username
  order by
    total_attempts desc;
$$;

-- =====================================================
-- 動作確認用クエリ（実行後に確認してください）
-- =====================================================
-- select * from public.v_player_shooting_totals;
-- select * from public.get_player_effort_ranking();
