import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { services } from "../services";
import type { GameMode, Score } from "../services/types";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard — Snake.OS" }] }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const [mode, setMode] = useState<GameMode>("walls");
  const [scores, setScores] = useState<Score[]>([]);

  useEffect(() => {
    let cancelled = false;
    services.scores.top(mode, 20).then((s) => !cancelled && setScores(s));
    return () => {
      cancelled = true;
    };
  }, [mode]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link to="/" className="mono text-xs text-muted-foreground hover:text-foreground">
        ← back
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Leaderboard</h1>

      <div className="mt-6 flex gap-2">
        {(["walls", "wrap"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`mono rounded-md px-4 py-2 text-xs uppercase tracking-wider ${
              mode === m
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "walls" ? "Walls" : "Pass-through"}
          </button>
        ))}
      </div>

      <ol className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
        {scores.length === 0 && (
          <li className="px-6 py-10 text-center text-sm text-muted-foreground">No scores yet.</li>
        )}
        {scores.map((s, i) => (
          <li key={s.id} className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-4">
              <span className="mono w-6 text-right text-sm text-muted-foreground">{i + 1}</span>
              <span className="text-foreground">@{s.username}</span>
            </div>
            <span className="mono text-lg font-bold text-primary">{s.score}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
