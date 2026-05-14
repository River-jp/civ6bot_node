export default function HomePage() {
  return (
    <main className="shell">
      <div className="topbar">
        <div>
          <div className="brand">Civ6 Bot</div>
          <p className="empty">Discordの/startから試合を作成してください。</p>
        </div>
        <a className="button" href="/using">使い方を見る</a>
      </div>
    </main>
  );
}
