# RISE Shooting 🏀

バスケットボール選手のシューティング記録・分析アプリ

---

## 概要

RISE Shooting は、バスケットボール部員が日々のシューティング練習を記録・蓄積し、エリア別の成功率をヒートマップで可視化するアプリです。選手のモチベーション向上とコーチの指導支援を目的としています。

---

## 主な機能

| 機能 | 対象 |
|------|------|
| ログイン（メール＋合言葉） | 全ユーザー |
| シューティング記録入力（5エリア同時登録） | 選手 |
| 個人ショットチャート（ヒートマップ＋期間集計） | 選手 |
| チームダッシュボード（努力量ランキング・エリア別トップ） | コーチ |
| 選手アカウント管理（作成・合言葉リセット） | コーチ |

---

## 技術スタック

- **フロントエンド**: Next.js 15 / TypeScript / Tailwind CSS
- **バックエンド**: Supabase (PostgreSQL)
- **ホスティング**: Vercel

---

## セットアップ手順

### 1. Supabase でテーブルを作成

Supabase ダッシュボードの SQL Editor で `supabase/schema.sql` を実行してください。

### 2. Vercel 環境変数の設定

Vercel のプロジェクト設定で以下の環境変数を設定してください：

| 変数名 | 値の取得場所 |
|--------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase > Settings > API > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase > Settings > API > anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase > Settings > API > service_role key |

### 3. Vercel にデプロイ

GitHub リポジトリを Vercel に連携してデプロイしてください。

### 4. コーチアカウント作成

Supabase の SQL Editor で以下を実行し、最初のコーチアカウントを作成します：

```sql
-- まず Supabase Auth でユーザーを手動作成（Dashboard > Authentication > Users）
-- その後、role を coach に変更する
UPDATE public.profiles SET role = 'coach' WHERE username = 'コーチ名';
```

---

## UIカラーテーマ

- 背景色: `#c0c0bf`（グレー）
- メインカラー: `#e1c614`（イエロー/ゴールド）
- アクセント: `#ffffff`（ホワイト）

---

## ドキュメント

- [要求定義書](./docs/要求定義書.md)
- [要件定義書](./docs/要件定義書.md)
- [デプロイ手順](./DEPLOYMENT.md)
