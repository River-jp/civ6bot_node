# Civ6 AI Discord Bot 運用設定

このドキュメントは、Bot サーバー管理者が行う設定と、利用者へ案内する内容をまとめたものです。利用者向けの短い手順は [USING.md](./USING.md) にあります。

## 1. Bot サーバー側

### 1-1. 前提

1. Node.js をインストールします。`package.json` では `24.x` を指定しています。
2. Discord Developer Portal で Bot アプリを作成します。
3. Gemini API キーを取得します。
4. DB を用意します。
   - 開発: `file:local.db`
   - 本番: Turso/libSQL 推奨

### 1-2. 環境変数

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

補足:

- `DISCORD_GUILD_ID` を設定すると、指定サーバー用の guild command として登録します。未設定なら global command として登録します。
- `APP_BASE_URL` はローカルや手動確認用です。Discord Interaction から返す試合ページ URL は実リクエストの origin を優先して生成します。
- 本番では `DATABASE_URL=file:local.db` を使わず、Turso/libSQL の URL を設定してください。

### 1-3. インストールと起動

```bash
npm install
npm run dev
```

### 1-4. Discord Interactions 設定

Discord Developer Portal で `Interactions Endpoint URL` を設定します。

```text
https://<your-domain>/api/discord/interactions
```

ローカル確認時は ngrok などで HTTPS 公開し、その URL を設定します。

### 1-5. slash command 登録

```bash
npm run register:commands -w @civ6bot/web
```

このスクリプトはルート `.env` と `apps/web/.env` を読み込みます。

登録されるコマンド:

- `/start`
- `/link`
- `/analyze`
- `/next`
- `/advice`
- `/status`
- `/close`
- `/help`

古い `/analyz` は現在使用しません。残っている場合は、このコマンド登録を再実行してください。

### 1-6. Vercel 本番デプロイ

1. Vercel にこのリポジトリを接続します。
2. Project Settings の Root Directory は repo root にします。`apps/web` にはしません。
3. Vercel Project の Environment Variables に本番用の値を設定します。
4. デプロイ後、Discord Developer Portal の Interactions Endpoint URL を本番 URL に更新します。
5. `npm run register:commands -w @civ6bot/web` を実行して Discord コマンドを更新します。

`vercel.json` は repo root から npm workspaces として build する設定です。

```json
{
  "framework": "nextjs",
  "installCommand": "npm install",
  "buildCommand": "npm run build -w @civ6bot/web",
  "outputDirectory": "apps/web/.next"
}
```

本番で `DATABASE_URL` が未設定の場合、API は DB 接続で失敗します。必ず Turso/libSQL の URL を設定してください。

### 1-7. サーバー運用フロー

1. 試合チャンネルで `/start` を実行します。
2. 参加者は Bot メッセージの参加ボタンを押します。
3. 各参加者が作成された専用チャンネルで `/link` を実行し、リンクコードを取得します。
4. 参加者側クライアントがコードを claim します。
5. 参加者側クライアントが `Lua.log` を監視し、スナップショットを送信します。
6. `/matches/<matchId>` で試合状況ページを閲覧します。
7. `/analyze` `/next` `/advice` で助言を返します。
8. 終了時は専用チャンネルで `/close` を実行し、参加情報と専用チャンネルを削除します。

## 2. Bot 利用者側

### 2-1. Civ6 Mod

1. `civ6-mod` を Civ6 の Mod フォルダへ配置します。
2. ゲーム内で Mod を有効化します。
3. ゲーム中に F8 を押すと `Lua.log` に `CIV6BOT_EXPORT:` 行が出力されることを確認します。

### 2-2. クライアント導入

利用者は Web サイトの `/using` から `install-civ6bot-client.bat` をダウンロードして実行します。

インストーラーの動作:

- GitHub の最新版 ZIP を PowerShell でダウンロード
- バッチを実行したフォルダ内の `Civ6BotClient` に展開
- `start-civ6bot-client.bat` を起動

正常終了でもエラーでも、最後に Enter を押すまでインストーラー画面は閉じません。

Git は不要です。Node.js と npm は必要です。

### 2-3. バッチメニュー

`start-civ6bot-client.bat` には次のメニューがあります。

```text
1. Link and start watch
2. Start watch
3. Unlink
4. Change Lua.log path
5. Exit
```

初回は `/link` で取得したコードを `1. Link and start watch` に入力します。リンク済みなら `2. Start watch` で監視だけ開始できます。

`3. Unlink` はサーバー側のトークンを無効化し、PC 側の保存済みリンク情報も削除します。

`4. Change Lua.log path` は監視する `Lua.log` のフルパスを `%USERPROFILE%\.civ6bot-log-path.txt` に保存します。保存済みのパスがある場合、次回起動時は標準パスより優先されます。

標準の監視対象:

```text
%LOCALAPPDATA%\Firaxis Games\Sid Meier's Civilization VI\Logs\Lua.log
```

## 3. よくある確認ポイント

1. `/link` が失敗する: 先に参加ボタンを押していない、またはアクティブな試合がない可能性があります。
2. リンクコードが使えない: 期限切れ、入力ミス、または使用済みです。`/link` を再実行してください。
3. スナップショット未反映: watch が停止している、または `Lua.log` パスが違います。必要なら `4. Change Lua.log path` で監視対象を変更してください。
4. AI 応答が簡易文になる: `GEMINI_API_KEY` が未設定です。
5. Discord コマンドが出ない: `register:commands` 未実行、または Bot の権限不足です。
6. 専用チャンネルが作成されない: Bot にチャンネル管理、チャンネル閲覧、メッセージ送信の権限があるか確認してください。
7. `/analyz` が残っている: 古いコマンドです。`register:commands` を再実行してください。
8. 試合状況ページが 404: `matchId` が誤っているか、試合が未作成です。
9. Vercel の install が失敗する: Root Directory が `apps/web` になっていないか確認してください。repo root にします。
