import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockServices } from "./mock";
import type { GameSnapshot, Services } from "./types";

function emptySnap(): GameSnapshot {
  return {
    size: 10,
    snake: [{ x: 1, y: 1 }],
    food: { x: 5, y: 5 },
    dir: { x: 1, y: 0 },
    score: 0,
    mode: "walls",
    over: false,
  };
}

let services: Services;
beforeEach(() => {
  window.localStorage.clear();
  services = createMockServices();
});

describe("mock services", () => {
  it("signup then login returns the same user", async () => {
    const u = await services.auth.signup({ username: "alice", password: "pw" });
    await services.auth.logout();
    const u2 = await services.auth.login({ username: "alice", password: "pw" });
    expect(u2.id).toBe(u.id);
  });

  it("rejects duplicate username", async () => {
    await services.auth.signup({ username: "bob", password: "x" });
    await expect(services.auth.signup({ username: "bob", password: "y" })).rejects.toThrow();
  });

  it("rejects bad password on login", async () => {
    await services.auth.signup({ username: "carol", password: "right" });
    await services.auth.logout();
    await expect(services.auth.login({ username: "carol", password: "wrong" })).rejects.toThrow();
  });

  it("scores.top sorts descending and filters by mode", async () => {
    await services.auth.signup({ username: "p1", password: "x" });
    await services.scores.submit("walls", 10);
    await services.scores.submit("walls", 50);
    await services.scores.submit("wrap", 999);
    const walls = await services.scores.top("walls");
    expect(walls.every((s) => s.mode === "walls")).toBe(true);
    for (let i = 1; i < walls.length; i++) {
      expect(walls[i - 1].score).toBeGreaterThanOrEqual(walls[i].score);
    }
    const wrap = await services.scores.top("wrap");
    expect(wrap[0].score).toBe(999);
  });

  it("live game lifecycle + subscribe", async () => {
    await services.auth.signup({ username: "spec", password: "x" });
    const game = await services.live.start("walls", emptySnap());
    const cb = vi.fn();
    const unsub = services.live.subscribe(game.id, cb);
    expect(cb).toHaveBeenCalled();

    const updated = { ...emptySnap(), score: 7 };
    await services.live.tick(game.id, updated);
    expect(cb).toHaveBeenLastCalledWith(expect.objectContaining({ snapshot: updated }));

    await services.live.end(game.id, 7);
    const list = await services.live.list();
    expect(list.find((g) => g.id === game.id)).toBeUndefined();
    unsub();
  });
});
