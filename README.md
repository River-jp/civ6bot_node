# Civ6 AI Discord Bot

Civilization VI のマルチプレイ向けに、Discord から試合を作成し、各プレイヤーのゲームログを集約して、試合状況ページと AI 助言を提供する Bot です。

Vercel 上の Discord HTTP Interactions Bot、Next.js の閲覧ページ、利用者 PC 側の Node クライアント、Civ6 Lua Mod で構成します。

## 構成

- `apps/web`: Next.js App Router。Discord Interactions、client API、Turso/libSQL DB、Gemini 助言、試合状況ページ、使い方ページを提供します。
- `packages/client`: 利用者 PC 側クライアント。Civ6 の `Lua.log` を監視し、`CIV6BOT_EXPORT:` の JSON を Bot サーバーへ送信します。
- `packages/shared`: Zod スキーマと共通型です。
- `civ6-mod`: F8 押下でローカルプレイヤー情報を `Lua.log` へ出力する Mod 雛形です。
- `start-civ6bot-client.bat`: 利用者 PC 側の起動バッチです。
- `apps/web/public/downloads/install-civ6bot-client.bat`: Web サイトから配布する利用者向けインストーラーです。

## セットアップ

```bash
npm install
cp .env.example .env
npm run dev
```

`.env` に Discord、Gemini、DB の値を設定します。ローカルでは `DATABASE_URL=file:local.db` で動作します。本番では Turso/libSQL の URL と `DATABASE_AUTH_TOKEN` を設定してください。

Discord Developer Portal では Interactions Endpoint URL を次に設定します。

```text
https://your-app.vercel.app/api/discord/interactions
```

slash command 登録:

```bash
npm run register:commands -w @civ6bot/web
```

登録されるコマンドは `/start` `/link` `/analyze` `/next` `/advice` `/status` `/help` です。

## Vercel デプロイ

この repo は npm workspaces です。Vercel の Root Directory は repo root にしてください。`apps/web` を Root Directory にすると `@civ6bot/shared` が解決できず、install に失敗します。

`vercel.json` で以下を指定しています。

```json
{
  "framework": "nextjs",
  "installCommand": "npm install",
  "buildCommand": "npm run build -w @civ6bot/web",
  "outputDirectory": "apps/web/.next"
}
```

本番環境では少なくとも次を Vercel Project の Environment Variables に設定してください。

```env
DISCORD_APPLICATION_ID=
DISCORD_PUBLIC_KEY=
DISCORD_BOT_TOKEN=
GEMINI_API_KEY=
DATABASE_URL=
DATABASE_AUTH_TOKEN=
```

`APP_BASE_URL` は任意です。Discord から呼ばれた実際の Vercel URL を使って試合ページ URL を生成するため、通常は未設定でも動作します。

## Web ページ

- `/`: トップページ。使い方ページへのリンクがあります。
- `/using`: 利用者向けの手順とクライアントインストーラーのダウンロードページです。
- `/matches/<matchId>`: 試合状況ページです。

## 利用フロー

1. Discord の試合チャンネルで `/start` を実行し、試合情報を入力します。
2. Bot のメッセージに表示される参加ボタンを各プレイヤーが押します。
3. 各プレイヤーが `/link` を実行し、表示されたリンクコードを PC 側バッチに入力します。
4. PC 側クライアントが `Lua.log` を監視し、Bot サーバーへスナップショットを送信します。
5. `/matches/<matchId>` で試合状況ページを確認します。
6. `/analyze` `/next` `/advice question:<質問>` で助言を受け取ります。

利用者向けの詳しい手順は [USING.md](./USING.md) を参照してください。

## PC 側クライアント

利用者は `/using` から `install-civ6bot-client.bat` をダウンロードして実行します。Git は不要です。インストーラーは GitHub の ZIP を PowerShell でダウンロードして展開します。正常終了でもエラーでも、最後に Enter を押すまでウィンドウは閉じません。

開発者が手元で直接実行する場合:

```bash
npm run client -- claim --code ABCD1234 --server https://your-app.vercel.app --log "C:\path\to\Lua.log"
npm run client -- watch --server https://your-app.vercel.app --log "C:\path\to\Lua.log"
npm run client -- unlink --server https://your-app.vercel.app
```

現在の利用者向け標準ログパス:

```text
%LOCALAPPDATA%\Firaxis Games\Sid Meier's Civilization VI\Logs\Lua.log
```

リンク解除は `unlink` API によりサーバー側トークンを無効化し、PC 側の保存済みリンク情報も削除します。

## 注意

- Vercel では Discord Gateway 常駐 Bot ではなく、Discord HTTP Interactions として動作します。
- 参加操作は絵文字リアクションではなく Discord コンポーネントのボタンです。
- Gemini API キー未設定時は簡易ルールベースのフォールバック助言を返します。
- `civ6-mod` は v1 の雛形です。Civ6 Lua API の環境差でホットキーイベントや取得可能項目が異なる場合は、`Scripts/Civ6Bot.lua` を調整してください。
