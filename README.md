# Anime to Spotify

Annictで視聴したアニメのテーマ曲をSpotifyプレイリストに変換するWebアプリケーションです。

## 機能

- Annictアカウントから視聴作品データをインポート
- アニメのテーマ曲（OP/ED）をSpotifyで自動検索
- 検索結果からSpotifyプレイリストを自動作成
- 作品一覧の管理とフィルタリング

## 必要な認証と設定

### 1. Annict API設定

1. [Annict Developers](https://developers.annict.com/) にアクセス
2. 新しいアプリケーションを作成
3. 以下の情報を取得：
   - Client ID
   - Client Secret
4. Redirect URIを設定：`http://127.0.0.1:3000/api/annict/callback`

### 2. Spotify API設定

1. [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) にアクセス
2. 新しいアプリを作成
3. 以下の情報を取得：
   - Client ID
   - Client Secret
4. Redirect URIを設定：`http://127.0.0.1:3000/api/spotify/callback`

### 3. Vercel環境変数設定

VercelダッシュボードまたはCLIで以下の環境変数を設定：

```bash
# Annict設定
ANNICT_CLIENT_ID=your_annict_client_id
ANNICT_CLIENT_SECRET=your_annict_client_secret
ANNICT_REDIRECT_URI=http://127.0.0.1:3000/api/annict/callback

# Spotify設定
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
NEXT_PUBLIC_BASE_URL=http://127.0.0.1:3000

# Supabase設定（データベースを使用する場合）
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
```

## インストールと実行

### ローカル開発環境

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

ブラウザで [http://121.0.0.7:3000](http://121.0.0.7:3000) を開いてください。

### Vercelへのデプロイ

```bash
# Vercel CLIのインストール
npm install -g vercel

# ログイン
vercel login

# デプロイ
vercel --prod
```

## 使用方法

1. **トップページにアクセス**
   - Annict認証とSpotify認証のボタンが表示されます

2. **Annict認証**
   - 「Annictでログイン」ボタンをクリック
   - Annictアカウントで認証を許可

3. **Spotify認証**
   - 「Spotifyでログイン」ボタンをクリック
   - Spotifyアカウントで認証を許可

4. **作品データのインポート**
   - 「作品をインポート」ボタンをクリック
   - インポートする作品のステータスを選択（見た、見た、など）
   - Annictから作品データを取得し、テーマ曲をSpotifyで検索

5. **プレイリスト作成**
   - 作品一覧からチェックボックスで作品を選択
   - 「プレイリスト作成」ボタンをクリック
   - プレイリスト名を入力して作成

## 技術スタック

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **External APIs**:
  - Annict API (アニメデータ取得)
  - Spotify Web API (楽曲検索・プレイリスト作成)
  - Syoboi API (テーマ曲情報取得)
- **Deployment**: Verce

### プロジェクト構造

```
src/
├── app/                    # Next.js App Router
