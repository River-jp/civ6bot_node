const commands = [
  ["/start", "試合を作成し、試合状況ページと参加ボタンを投稿します。"],
  ["/link", "PC クライアントと接続するためのリンクコードを発行します。"],
  ["/status", "自分のリンク状態と試合ページ URL を確認します。"],
  ["/analyze", "最新データを分析します。"],
  ["/next", "次にやることを提案します。"],
  ["/advice", "任意の質問に対して助言を返します。"],
  ["/help", "コマンド一覧を表示します。"]
];

export default function UsingPage() {
  return (
    <main className="shell">
      <div className="topbar">
        <div>
          <div className="brand">Civ6 Bot 使い方</div>
          <p className="empty">Discord と PC クライアントをリンクして、試合状況と助言を使うための手順です。</p>
        </div>
        <a className="button" href="/downloads/install-civ6bot-client.bat" download>
          クライアントをインストール
        </a>
      </div>

      <section className="grid">
        <div className="panel">
          <h1>最初に必要なもの</h1>
          <ul className="steps">
            <li>Windows PC</li>
            <li>Node.js</li>
            <li>Civilization VI</li>
            <li>Bot が入っている Discord サーバー</li>
          </ul>
          <p className="empty">
            Node.js は公式サイトからインストールしてください。インストール後、バッチファイルが node と npm を確認します。
          </p>
        </div>

        <div className="panel">
          <h2>ダウンロード</h2>
          <p>
            下のボタンからインストーラーをダウンロードし、実行してください。Git は不要です。最新版のクライアント一式を
            <code>%LOCALAPPDATA%\Civ6BotClient</code> に展開して起動します。
          </p>
          <a className="button secondary" href="/downloads/install-civ6bot-client.bat" download>
            install-civ6bot-client.bat
          </a>
        </div>
      </section>

      <section className="panel section">
        <h2>Discord での手順</h2>
        <ol className="steps">
          <li>試合チャンネルで <code>/start</code> を実行します。</li>
          <li>試合設定を入力して送信します。</li>
          <li>Bot が投稿した「参加してDMを開始」ボタンを各プレイヤーが押します。</li>
          <li>各プレイヤーが <code>/link</code> を実行します。</li>
          <li>表示されたリンクコードを PC クライアントのバッチファイルに入力します。</li>
        </ol>
      </section>

      <section className="panel section">
        <h2>PC クライアントでの手順</h2>
        <ol className="steps">
          <li><code>install-civ6bot-client.bat</code> を実行します。</li>
          <li>Node.js と npm の確認が表示されます。</li>
          <li>初回は <code>1. Link and start watch</code> を選びます。</li>
          <li>Discord の <code>/link</code> で表示されたコードを入力します。</li>
          <li>リンクに成功すると watch モードが起動します。</li>
          <li>Civ6 のログが更新されると、試合状況ページに反映されます。</li>
        </ol>
        <p className="empty">
          監視するログは <code>%LOCALAPPDATA%\Firaxis Games\Sid Meier&apos;s Civilization VI\Logs\Lua.log</code> です。
        </p>
      </section>

      <section className="panel section">
        <h2>Discord コマンド</h2>
        <table className="players">
          <thead>
            <tr>
              <th>コマンド</th>
              <th>説明</th>
            </tr>
          </thead>
          <tbody>
            {commands.map(([command, description]) => (
              <tr key={command}>
                <td><code>{command}</code></td>
                <td>{description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid">
        <div className="panel">
          <h2>うまく動かない時</h2>
          <ul className="steps">
            <li>リンクコードは期限切れや使用済みになるため、失敗したら <code>/link</code> を再実行してください。</li>
            <li><code>Lua.log</code> が見つからない場合は Civilization VI を一度起動してください。</li>
            <li>試合状況が更新されない場合は、watch モードが起動したままか確認してください。</li>
          </ul>
        </div>

        <div className="panel">
          <h2>リンク解除</h2>
          <p>
            PC 側のバッチファイルを起動し、メニューから <code>3. Unlink</code> を選びます。
          </p>
          <p className="empty">
            サーバー側のトークンを無効化し、PC 側の保存済みリンク情報も削除します。
          </p>
        </div>
      </section>
    </main>
  );
}
