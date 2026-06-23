import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SnakeBoard } from "../components/SnakeBoard";
import { services } from "../services";
import type { LiveGame } from "../services/types";

export const Route = createFileRoute("/watch/$gameId")({
  head: () => ({ meta: [{ title: "Spectate — Snake.OS" }] }),
  component: WatchGamePage,
});

function WatchGamePage() {
  const { gameId } = Route.useParams();
  const [game, setGame] = useState<LiveGame | null>(null);

  useEffect(() => services.live.subscribe(gameId, setGame), [gameId]);

  if (!game) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link to="/watch" className="mono text-xs text-muted-foreground hover:text-foreground">
          ← back
        </Link>
        <p className="mt-10 text-center text-muted-foreground">Game not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-10">
      <div className="flex w-full items-center justify-between">
        <Link to="/watch" className="mono text-xs text-muted-foreground hover:text-foreground">
          ← all games
        </Link>
        <div className="mono text-sm">
          <span className="text-primary">@{game.username}</span>
          <span className="mx-3 text-muted-foreground">·</span>
          <span className="text-muted-foreground">{game.mode.toUpperCase()}</span>
          <span className="mx-3 text-muted-foreground">·</span>
          <span className="text-primary">{game.snapshot.score}</span>
        </div>
      </div>
      <SnakeBoard snapshot={game.snapshot} />
      {!game.active && (
        <p className="text-sm text-muted-foreground">This game has ended.</p>
      )}
    </div>
  );
}
