import { publicMatch } from "@/lib/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await publicMatch(id);
  if (!match) notFound();

  const latestTurn = match.latestTurn as { turn?: number; year?: string; era?: string; created_at?: string } | null;

  return (
    <main className="shell">
      <div className="topbar">
        <div>
          <div className="brand">Civ6 Bot 試合状況</div>
          <p className="empty">{match.id}</p>
        </div>
        <div className="label">状態: {match.status}</div>
      </div>

      <section className="grid">
        <div className="panel">
          <h1>全体情報</h1>
          <div className="stat-grid">
            <div className="stat">
              <div className="label">ターン</div>
              <div className="value">{latestTurn?.turn ?? "未送信"}</div>
            </div>
            <div className="stat">
              <div className="label">年代</div>
              <div className="value">{latestTurn?.year ?? "-"}</div>
            </div>
            <div className="stat">
              <div className="label">時代</div>
              <div className="value">{latestTurn?.era ?? match.settings.era}</div>
            </div>
          </div>
          <p className="empty">最終更新: {latestTurn?.created_at ?? "なし"}</p>
        </div>

        <div className="panel">
          <h2>設定</h2>
          <p>マップ: {match.settings.mapSize}</p>
          <p>速度: {match.settings.gameSpeed}</p>
          <p>勝利条件: {match.settings.victoryTypes.join(", ") || "-"}</p>
          <p>参加上限: {match.settings.maxPlayers}</p>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 20 }}>
        <h2>プレイヤー</h2>
        <table className="players">
          <thead>
            <tr>
              <th>名前</th>
              <th>文明</th>
              <th>指導者</th>
              <th>リンク</th>
              <th>最終送信</th>
            </tr>
          </thead>
          <tbody>
            {match.players.map((player) => (
              <tr key={String(player.id)}>
                <td>{String(player.display_name)}</td>
                <td>{String(player.civilization ?? "-")}</td>
                <td>{String(player.leader ?? "-")}</td>
                <td>{player.linked_at ? "済み" : "未リンク"}</td>
                <td>{String(player.last_snapshot_at ?? "-")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
