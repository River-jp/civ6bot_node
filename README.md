# Civ6 AI Discord Bot

Civilization VIのマルチプレイ初心者向けに、Discord上で行動方針を助言するBotです。Vercel上のHTTP Interactions Bot、閲覧専用Webサイト、ユーザー側Node companion、Civ6 Lua Modで構成します。

## 構成

- `apps/web`: Next.js App Router。Discord Interactions、Turso/libSQL DB、Gemini助言、試合閲覧ページを提供します。
- `packages/client`: ユーザー側Node companion。Civ6の`Lua.log`を監視し、タグ付きJSONをBotサーバーへ送信します。
- `packages/shared`: Zodスキーマと共通型です。
- `civ6-mod`: F8押下でローカルプレイヤー情報を`Lua.log`へ出力するMod雛形です。

## セットアップ

```bash
npm install
cp .env.example .env
npm run dev
```

`.env`にDiscord、Gemini、DBの値を設定します。ローカルでは`DATABASE_URL=file:local.db`で動作します。本番ではTurso/libSQLのURLと`DATABASE_AUTH_TOKEN`を設定してください。

Discord Developer PortalではInteractions Endpoint URLを次に設定します。

```text
https://your-app.vercel.app/api/discord/interactions
```

slash command登録:

```bash
npm run register:commands -w @civ6bot/web
```

## 使い方

1. Discordの試合チャンネルで`/start`を実行し、試合情報を入力します。
2. Botのメッセージに表示される参加ボタンを各プレイヤーが押します。
3. 各プレイヤーが`/link`を実行し、表示されたコードをNode companionに入力します。
4. Civ6でModを有効化し、ゲーム中にF8を押して`Lua.log`へ情報を出力します。
5. Node companionがログを監視し、Botサーバーへスナップショットを送信します。
6. `/analyze`、`/next`、`/advice question:<質問>`で助言を受け取ります。
7. `/matches/<matchId>`で閲覧専用の試合状況ページを確認します。

Node companion:

```bash
npm run client -- claim --code ABCD1234 --server https://your-app.vercel.app
npm run client -- watch
```

Lua.logの場所が標準と違う場合:

```bash
npm run client -- watch --log "C:\path\to\Lua.log"
```

## 注意

- VercelではDiscord Gateway常駐Botではなく、Discord HTTP Interactionsとして動作します。
- 参加操作は絵文字リアクションではなく、Discordコンポーネントのボタンです。
- Gemini APIキー未設定時は簡易ルールベースのフォールバック助言を返します。
- `civ6-mod`はv1の雛形です。Civ6 Lua APIの環境差でホットキーイベントや取得可能項目が異なる場合は、`Scripts/Civ6Bot.lua`を調整してください。
