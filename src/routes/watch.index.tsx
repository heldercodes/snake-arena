import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { services } from "../services";
import type { LiveGame } from "../services/types";

export const Route = createFileRoute("/watch/")({
  head: () => ({ meta: [{ title: "Watch — Snake.OS" }] }),
  component: WatchListPage,
});

function WatchListPage() {
  const [games, setGames] = useState<LiveGame[]>([]);

  useEffect(() => services.live.subscribeList(setGames), []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link to="/" className="mono text-xs text-muted-foreground hover:text-foreground">
        ← back
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Live games</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Watch other players in real time.
      </p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {games.length === 0 && (
          <li className="col-span-full rounded-xl border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
            No active games right now.
          </li>
        )}
        {games.map((g) => (
          <li key={g.id}>
            <Link
              to="/watch/$gameId"
              params={{ gameId: g.id }}
              className="block rounded-xl border border-border bg-card p-5 transition hover:border-primary"
            >
              <div className="flex items-center justify-between">
                <span className="mono text-sm text-primary">@{g.username}</span>
                <span className="mono text-xs uppercase text-muted-foreground">{g.mode}</span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Score</span>
                <span className="mono text-2xl font-bold text-primary">{g.snapshot.score}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
