# デプロイ手順 - RISE Shooting

---

## 前提条件

- GitHub アカウント（リポジトリ: `RISE-Shooting`）
- Supabase アカウント
- Vercel アカウント

---

## Step 1: Supabase プロジェクト設定

### 1-1. プロジェクト作成
1. [Supabase ダッシュボード](https://supabase.com/dashboard) にログイン
2. 「New project」をクリック
3. プロジェクト名: `rise-shooting` / リージョン: `Northeast Asia (Tokyo)` を推奨

### 1-2. データベーススキーマ適用
1. Supabase ダッシュボード > SQL Editor を開く
2. `supabase/schema.sql` の内容をコピー＆ペーストして実行
3. エラーがなければ完了

### 1-3. メール確認の無効化（推奨）
選手がメール確認なしでログインできるよう設定します：
1. Authentication > Providers > Email
2. 「Confirm email」を OFF にする

### 1-4. API キーを控える
Settings > API から以下をコピー：
- Project URL
- anon/public key
- service_role key（⚠️ 絶対に公開しないこと）

---

## Step 2: Vercel プロジェクト設定

### 2-1. リポジトリ連携
1. [Vercel](https://vercel.com) にログイン
2. 「Add New Project」> GitHub の `RISE-Shooting` リポジトリを選択
3. Framework Preset: **Next.js** を選択

### 2-2. 環境変数設定
Project Settings > Environment Variables で以下を追加：

| 変数名 | 値 | 環境 |
|--------|-----|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | Production / Preview / Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Production / Preview / Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key | Production / Preview / Development |

### 2-3. デプロイ実行
「Deploy」ボタンをクリック → 自動的にビルドが始まります。

---

## Step 3: 初期データ設定

### 3-1. コーチアカウント作成

#### 方法A: Supabase ダッシュボードから（推奨）
1. Authentication > Users > 「Add user」
2. メールアドレスとパスワードを入力
3. 作成後、SQL Editor で以下を実行：
```sql
UPDATE public.profiles
SET role = 'coach', username = 'コーチ名'
WHERE id = '作成したユーザーのUUID';
```

#### 方法B: SQL で直接作成
```sql
-- Supabase Auth は使用せず、auth.users に直接 insert するのは非推奨
-- 方法A を使用してください
```

### 3-2. 選手アカウント作成
コーチアカウントでアプリにログイン後、アカウント管理画面（M-02）から選手を追加できます。

---

## Step 4: 動作確認（ホスティング後）

1. Vercel の URL にアクセス
2. コーチアカウントでログイン → コーチダッシュボードに遷移することを確認
3. アカウント管理から選手を1人作成
4. 選手アカウントでログイン → シューティング記録入力画面に遷移することを確認
5. シュートを記録 → マイ記録画面に反映されることを確認

---

## トラブルシューティング

### ログインできない
- Supabase の「Confirm email」が ON になっていないか確認（OFF を推奨）
- 環境変数が正しく設定されているか確認

### データが表示されない
- RLS（行レベルセキュリティ）のポリシーが正しく適用されているか確認
- `supabase/schema.sql` を再実行

### 選手作成に失敗する
- `SUPABASE_SERVICE_ROLE_KEY` が Vercel の環境変数に設定されているか確認

---

## Supabase Auth 設定（重要）

Supabase ダッシュボード > Authentication > Redirect URLs に以下を追加：
- `https://あなたのVercelドメイン.vercel.app/**`

---

## ブランチ運用

- `main`: 本番環境（Vercel Production に連携）
- `genspark_ai_developer`: AI 開発用（PR 経由でマージ）
