# Civ6 Bot 利用手順

この Bot は Discord の試合チャンネルで試合を作成し、各プレイヤーの Civilization VI ログから情報を送信して、試合状況ページと助言コマンドを使えるようにします。

## 必要なもの

- Windows PC
- Node.js
- Civilization VI
- Discord で Bot が入っているサーバー
- Civ6 Bot クライアント一式

Node.js は https://nodejs.org/ から LTS または Current をインストールしてください。インストール後、コマンドプロンプトで `node --version` と `npm --version` が表示されれば準備完了です。

## クライアントのインストール

Web サイトの「使い方」ページから `install-civ6bot-client.bat` をダウンロードして実行します。

このインストーラーは次を行います。

- GitHub から Civ6 Bot の最新版 ZIP をダウンロード
- `%LOCALAPPDATA%\Civ6BotClient` に展開
- `start-civ6bot-client.bat` を起動

Git は不要です。インストーラーは `git clone` ではなく、Windows 標準の PowerShell で ZIP をダウンロードして展開します。

すでにインストール済みの場合も、同じインストーラーを再実行すると最新版に更新できます。

## Discord 側の流れ

1. 試合を行う Discord チャンネルで `/start` を実行します。
2. 試合設定を入力して送信します。
3. Bot が試合状況ページの URL と参加ボタンを投稿します。
4. 参加するプレイヤーは「参加してDMを開始」を押します。
5. 各プレイヤーは同じチャンネルで `/link` を実行します。
6. 表示されたリンクコードをクライアントのバッチファイルに入力します。

`/link` のコードは一度使うか、期限が切れると使えません。失敗した場合は `/link` を再実行して新しいコードを発行してください。

## PC 側の流れ

1. `install-civ6bot-client.bat` または `start-civ6bot-client.bat` を実行します。
2. Node.js と npm の確認が表示されます。
3. リンクコードを入力します。
4. リンクに成功すると watch モードが起動します。
5. watch モード中は Civilization VI の `Lua.log` を監視し、ゲーム情報をサーバーに送信します。

監視対象のログは通常ここです。

```text
%LOCALAPPDATA%\Firaxis Games\Sid Meier's Civilization VI\Logs\Lua.log
```

## Web ページで見るもの

`/start` 後に Discord に投稿される URL から、試合状況ページを開けます。

試合状況ページでは以下を確認できます。

- 試合 ID
- 現在ターン
- 年代
- 時代
- プレイヤー一覧
- リンク状態
- 最終送信時刻

## Discord コマンド

- `/start`: 試合を作成します。
- `/link`: PC クライアントとリンクするコードを発行します。
- `/status`: 自分のリンク状態と試合ページ URL を確認します。
- `/analyze`: 最新データを分析します。
- `/next`: 次にやることを提案します。
- `/advice question:<質問>`: 任意の質問に対して助言を返します。
- `/help`: コマンド一覧を表示します。

## よくある問題

### バッチファイルがすぐ閉じる

現在のバッチファイルは最後に停止するようになっています。古いファイルを使っている場合は、Web サイトから新しい `install-civ6bot-client.bat` をダウンロードし直してください。

### Node.js がないと言われる

Node.js をインストール後、PC を再起動するか、新しいコマンドプロンプトで実行してください。

### Lua.log が見つからない

Civilization VI を一度起動してください。ログ出力が無効な場合は、Civ6 の設定や Mod 側のログ出力設定を確認してください。

### リンクに失敗する

リンクコードが期限切れ、入力ミス、または使用済みの可能性があります。Discord で `/link` を再実行し、新しいコードを入力してください。

### 試合状況ページが更新されない

クライアントの watch モードが起動しているか、Civ6 側でログが更新されているかを確認してください。

## リンク解除

ローカル PC 側のリンク情報を削除する場合は、次のファイルを削除します。

```text
%USERPROFILE%\.civ6bot-client.json
```

PowerShell では次のコマンドで削除できます。

```powershell
Remove-Item "$env:USERPROFILE\.civ6bot-client.json"
```

削除後は、再度 `/link` でコードを発行してリンクし直してください。
