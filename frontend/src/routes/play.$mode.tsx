import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { SnakeBoard } from "../components/SnakeBoard";
import { createState, dirVec, step, turn } from "../game/engine";
import { directionFromKeyboardEvent } from "../game/input";
import { useAuth } from "../hooks/useAuth";
import { services } from "../services";
import type { GameMode, GameSnapshot, LiveGame } from "../services/types";

export const Route = createFileRoute("/play/$mode")({
  head: () => ({ meta: [{ title: "Play — Snake.OS" }] }),
  component: PlayPage,
});

function sameDirection(a: GameSnapshot["dir"], b: GameSnapshot["dir"]) {
  return a.x === b.x && a.y === b.y;
}

function PlayPage() {
  const params = Route.useParams();
  const mode = (params.mode === "wrap" ? "wrap" : "walls") as GameMode;
  const user = useAuth();
  const navigate = useNavigate();

  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => createState(mode));
  const [submitted, setSubmitted] = useState(false);
  const stateRef = useRef(snapshot);
  const liveRef = useRef<LiveGame | null>(null);
  const turnedThisStepRef = useRef(false);

  stateRef.current = snapshot;

  // start live game once user known
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const g = await services.live.start(mode, stateRef.current);
      if (!cancelled) liveRef.current = g;
    })();
    return () => {
      cancelled = true;
      if (liveRef.current) {
        services.live.end(liveRef.current.id, stateRef.current.score);
        liveRef.current = null;
      }
    };
  }, [user, mode]);

  // game loop
  useEffect(() => {
    const interval = window.setInterval(() => {
      setSnapshot((prev) => {
        if (prev.over) return prev;
        turnedThisStepRef.current = false;
        const out = step(prev);
        stateRef.current = out;
        if (liveRef.current) services.live.tick(liveRef.current.id, out);
        return out;
      });
    }, 130);
    return () => clearInterval(interval);
  }, []);

  // submit on game over
  useEffect(() => {
    if (snapshot.over && !submitted && user) {
      setSubmitted(true);
      services.scores.submit(mode, snapshot.score).catch(() => {});
      if (liveRef.current) {
        services.live.end(liveRef.current.id, snapshot.score);
        liveRef.current = null;
      }
    }
  }, [snapshot.over, snapshot.score, submitted, user, mode]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const d = directionFromKeyboardEvent(e);
      if (d) {
        e.preventDefault();
        if (turnedThisStepRef.current) return;

        const next = turn(stateRef.current, dirVec(d));
        if (sameDirection(next.dir, stateRef.current.dir)) return;
        turnedThisStepRef.current = true;
        stateRef.current = next;
        setSnapshot(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const restart = useCallback(async () => {
    setSnapshot(createState(mode));
    setSubmitted(false);
    if (user) {
      const g = await services.live.start(mode, createState(mode));
      liveRef.current = g;
    }
  }, [mode, user]);

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6">
        <p className="text-muted-foreground">You need to sign in to play.</p>
        <button
          onClick={() => navigate({ to: "/auth/login" })}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-10">
      <div className="flex w-full items-center justify-between">
        <Link to="/" className="mono text-xs text-muted-foreground hover:text-foreground">
          ← back
        </Link>
        <div className="mono text-sm">
          <span className="text-muted-foreground">MODE </span>
          <span className="text-primary">{mode.toUpperCase()}</span>
          <span className="mx-3 text-muted-foreground">·</span>
          <span className="text-muted-foreground">SCORE </span>
          <span className="text-primary">{snapshot.score}</span>
        </div>
      </div>

      <SnakeBoard snapshot={snapshot} />

      <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
        <p>Arrow keys or WASD to move</p>
        {snapshot.over && (
          <button
            onClick={restart}
            className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Play again
          </button>
        )}
      </div>
    </div>
  );
}
