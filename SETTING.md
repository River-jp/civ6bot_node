# SETTING.md

このドキュメントは、Civ6 AI Discord Botを運用するために必要な作業を
`Botサーバー側` と `Bot利用ユーザー側` に分けてまとめたものです。

## 1. Botサーバー側でやること

### 1-1. 前提準備

1. Node.js 20以上をインストール
2. Discord Developer PortalでBotアプリを作成
3. Gemini APIキーを取得
4. DBを用意
   - 開発: `file:local.db`
   - 本番: Turso/libSQL推奨

### 1-2. 環境変数を設定

ルートの `.env` を作成し、以下を設定します。

```env
DISCORD_APPLICATION_ID=
DISCORD_PUBLIC_KEY=
DISCORD_BOT_TOKEN=
DISCORD_GUILD_ID=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.1-flash-lite-preview
DATABASE_URL=file:local.db
DATABASE_AUTH_TOKEN=
APP_BASE_URL=http://localhost:3000
```

### 1-3. インストールと起動

```bash
npm install
npm run dev
```

### 1-4. DiscordのInteractions設定

Discord Developer Portalで `Interactions Endpoint URL` を設定:

```text
https://<your-domain>/api/discord/interactions
```

ローカル確認時は ngrok 等でHTTPS公開して同URLに設定します。

### 1-5. slash command登録

```bash
npm run register:commands -w @civ6bot/web
```

### 1-6. Vercel本番デプロイ

1. Vercelにこのリポジトリを接続
2. `.env` と同じ環境変数をVercel Projectに設定
3. デプロイ後、`APP_BASE_URL` を本番URLに更新
4. DiscordのEndpoint URLを本番URLへ更新

### 1-7. サーバー運用フロー

1. 試合チャンネルで `/start`
2. 参加者はBotメッセージの `参加ボタン` を押す
3. 各参加者が `/link` でリンクコードを取得
4. 参加者側Node companionがコードを `claim`
5. 参加者がCiv6でF8出力すると、サーバーにスナップショットが送信される
6. `/analyze` `/analyz` `/next` `/advice` で助言を返す
7. `APP_BASE_URL/matches/<matchId>` で観戦用ページを閲覧

## 2. Bot利用ユーザー側でやること

### 2-1. Civ6 Modを導入

1. `civ6-mod` をCiv6のModフォルダへ配置
2. ゲーム内でModを有効化
3. ゲーム中に `F8` を押すと `Lua.log` に `CIV6BOT_EXPORT:` 行が出力されることを確認

### 2-2. Node companionをセットアップ

1. Node.js 20以上をインストール
2. このリポジトリを取得
3. 以下でリンクコードを登録

```bash
npm run client -- claim --code <LINK_CODE> --server https://<your-domain>
```

4. ログ監視を開始

```bash
npm run client -- watch
```

`Lua.log` のパスが標準と異なる場合:

```bash
npm run client -- watch --log "C:\path\to\Lua.log"
```

### 2-3. ユーザーの利用手順

1. Discordで参加ボタンを押す
2. `/link` を実行してコード取得
3. `claim` 実行
4. Civ6でF8を押して情報出力
5. `/next` か `/advice` で助言を受ける

## 3. よくある確認ポイント

1. `/link` が失敗する: 先に参加ボタンを押していない可能性
2. スナップショット未反映: `watch` が停止している、または `Lua.log` パス違い
3. AI応答が簡易文になる: `GEMINI_API_KEY` 未設定
4. Discordコマンドが出ない: `register:commands` 未実行、またはアプリ権限不足
5. 観戦ページが404: `matchId` が誤っているか、試合が未作成
