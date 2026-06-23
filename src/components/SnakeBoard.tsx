import { useEffect, useRef } from "react";
import type { GameSnapshot } from "../services/types";

interface Props {
  snapshot: GameSnapshot;
  pixelSize?: number;
}

export function SnakeBoard({ snapshot, pixelSize = 24 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dim = snapshot.size * pixelSize;

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const css = getComputedStyle(document.documentElement);
    const board = css.getPropertyValue("--board").trim() || "#0b1220";
    const grid = css.getPropertyValue("--grid").trim() || "#1a2540";
    const snake = css.getPropertyValue("--snake").trim() || "#7cffb2";
    const food = css.getPropertyValue("--food").trim() || "#ff5cd3";

    ctx.fillStyle = board;
    ctx.fillRect(0, 0, dim, dim);

    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= snapshot.size; i++) {
      ctx.beginPath();
      ctx.moveTo(i * pixelSize + 0.5, 0);
      ctx.lineTo(i * pixelSize + 0.5, dim);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * pixelSize + 0.5);
      ctx.lineTo(dim, i * pixelSize + 0.5);
      ctx.stroke();
    }

    ctx.fillStyle = food;
    const fp = snapshot.food;
    const fpad = 4;
    ctx.fillRect(fp.x * pixelSize + fpad, fp.y * pixelSize + fpad, pixelSize - fpad * 2, pixelSize - fpad * 2);

    ctx.fillStyle = snake;
    snapshot.snake.forEach((p, i) => {
      const pad = i === 0 ? 1 : 2;
      ctx.fillRect(p.x * pixelSize + pad, p.y * pixelSize + pad, pixelSize - pad * 2, pixelSize - pad * 2);
    });

    if (snapshot.over) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, dim, dim);
      ctx.fillStyle = snake;
      ctx.font = "bold 32px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", dim / 2, dim / 2);
    }
  }, [snapshot, pixelSize, dim]);

  return (
    <canvas
      ref={ref}
      width={dim}
      height={dim}
      className="rounded-lg border border-border shadow-[0_0_40px_-12px_var(--snake)]"
      style={{ background: "var(--board)" }}
    />
  );
}
