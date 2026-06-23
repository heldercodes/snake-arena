import type {
  AuthCredentials,
  GameMode,
  GameSnapshot,
  LiveGame,
  Score,
  Services,
  Unsubscribe,
  User,
} from "./types";

interface StoredUser extends User {
  passHash: string;
}

const STORAGE_USER = "snake_mock_user";

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}

function uid(prefix = ""): string {
  return prefix + Math.random().toString(36).slice(2, 10);
}

export function createMockServices(): Services {
  const users = new Map<string, StoredUser>();
  const scores: Score[] = [];
  const games = new Map<string, LiveGame>();
  const gameSubs = new Map<string, Set<(g: LiveGame | null) => void>>();
  const listSubs = new Set<(games: LiveGame[]) => void>();
  const authSubs = new Set<(u: User | null) => void>();

  let current: User | null = null;

  // restore session
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_USER);
      if (raw) current = JSON.parse(raw);
    } catch {
      /* ignore */
    }
  }

  // ---- seed demo data ----
  const demoUsers = [
    { username: "neon", password: "demo" },
    { username: "pixel", password: "demo" },
    { username: "viper", password: "demo" },
  ];
  for (const d of demoUsers) {
    const u: StoredUser = { id: uid("u_"), username: d.username, passHash: hash(d.password) };
    users.set(d.username, u);
  }
  const demoScoresSeed: Array<[string, GameMode, number]> = [
    ["neon", "walls", 42],
    ["pixel", "walls", 31],
    ["viper", "walls", 67],
    ["neon", "wrap", 88],
    ["pixel", "wrap", 120],
    ["viper", "wrap", 54],
  ];
  for (const [name, mode, score] of demoScoresSeed) {
    const u = users.get(name)!;
    scores.push({
      id: uid("s_"),
      userId: u.id,
      username: u.username,
      mode,
      score,
      createdAt: Date.now() - Math.floor(Math.random() * 1e7),
    });
  }

  // seed a couple of synthetic live games that auto-wander so the watch page feels alive
  function spawnDemoGame(name: string, mode: GameMode) {
    const u = users.get(name)!;
    const size = 20;
    const game: LiveGame = {
      id: uid("g_"),
      userId: u.id,
      username: u.username,
      mode,
      startedAt: Date.now(),
      active: true,
      snapshot: {
        size,
        snake: [
          { x: 10, y: 10 },
          { x: 9, y: 10 },
          { x: 8, y: 10 },
        ],
        food: { x: 5, y: 5 },
        dir: { x: 1, y: 0 },
        score: 0,
        mode,
        over: false,
      },
    };
    games.set(game.id, game);

    if (typeof window !== "undefined") {
      const interval = window.setInterval(() => {
        const snap = game.snapshot;
        // pick random direction occasionally
        if (Math.random() < 0.25) {
          const opts = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 },
          ];
          const next = opts[Math.floor(Math.random() * opts.length)];
          if (next.x !== -snap.dir.x || next.y !== -snap.dir.y) snap.dir = next;
        }
        const head = snap.snake[0];
        let nx = head.x + snap.dir.x;
        let ny = head.y + snap.dir.y;
        if (mode === "wrap") {
          nx = (nx + size) % size;
          ny = (ny + size) % size;
        } else if (nx < 0 || ny < 0 || nx >= size || ny >= size) {
          // reset
          snap.snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }];
          snap.score = 0;
          snap.dir = { x: 1, y: 0 };
          notifyGame(game.id);
          return;
        }
        const newSnake = [{ x: nx, y: ny }, ...snap.snake];
        if (nx === snap.food.x && ny === snap.food.y) {
          snap.score += 1;
          snap.food = { x: Math.floor(Math.random() * size), y: Math.floor(Math.random() * size) };
        } else {
          newSnake.pop();
        }
        snap.snake = newSnake;
        notifyGame(game.id);
        notifyList();
      }, 250);
      // best-effort: tied to page lifetime
      void interval;
    }
  }
  if (typeof window !== "undefined") {
    spawnDemoGame("neon", "walls");
    spawnDemoGame("pixel", "wrap");
  }

  function notifyGame(id: string) {
    const subs = gameSubs.get(id);
    if (!subs) return;
    const g = games.get(id) ?? null;
    subs.forEach((cb) => cb(g));
  }
  function notifyList() {
    const arr = Array.from(games.values()).filter((g) => g.active);
    listSubs.forEach((cb) => cb(arr));
  }
  function setCurrent(u: User | null) {
    current = u;
    if (typeof window !== "undefined") {
      if (u) window.localStorage.setItem(STORAGE_USER, JSON.stringify(u));
      else window.localStorage.removeItem(STORAGE_USER);
    }
    authSubs.forEach((cb) => cb(u));
  }

  return {
    auth: {
      async signup({ username, password }: AuthCredentials) {
        if (!username || !password) throw new Error("Username and password required");
        if (users.has(username)) throw new Error("Username already taken");
        const u: StoredUser = { id: uid("u_"), username, passHash: hash(password) };
        users.set(username, u);
        const pub = { id: u.id, username: u.username };
        setCurrent(pub);
        return pub;
      },
      async login({ username, password }: AuthCredentials) {
        const u = users.get(username);
        if (!u || u.passHash !== hash(password)) throw new Error("Invalid credentials");
        const pub = { id: u.id, username: u.username };
        setCurrent(pub);
        return pub;
      },
      async logout() {
        setCurrent(null);
      },
      currentUser() {
        return current;
      },
      onAuthChange(cb) {
        authSubs.add(cb);
        cb(current);
        return () => authSubs.delete(cb);
      },
    },
    scores: {
      async submit(mode, score) {
        if (!current) throw new Error("Not signed in");
        const s: Score = {
          id: uid("s_"),
          userId: current.id,
          username: current.username,
          mode,
          score,
          createdAt: Date.now(),
        };
        scores.push(s);
        return s;
      },
      async top(mode, limit = 10) {
        return scores
          .filter((s) => s.mode === mode)
          .sort((a, b) => b.score - a.score || a.createdAt - b.createdAt)
          .slice(0, limit);
      },
    },
    live: {
      async start(mode, snapshot) {
        if (!current) throw new Error("Not signed in");
        const g: LiveGame = {
          id: uid("g_"),
          userId: current.id,
          username: current.username,
          mode,
          startedAt: Date.now(),
          active: true,
          snapshot,
        };
        games.set(g.id, g);
        notifyList();
        return g;
      },
      async tick(gameId, snapshot) {
        const g = games.get(gameId);
        if (!g) return;
        g.snapshot = snapshot;
        notifyGame(gameId);
      },
      async end(gameId, finalScore) {
        const g = games.get(gameId);
        if (!g) return;
        g.active = false;
        g.snapshot = { ...g.snapshot, score: finalScore, over: true };
        notifyGame(gameId);
        notifyList();
      },
      async list() {
        return Array.from(games.values()).filter((g) => g.active);
      },
      async get(gameId) {
        return games.get(gameId) ?? null;
      },
      subscribe(gameId, cb): Unsubscribe {
        let set = gameSubs.get(gameId);
        if (!set) {
          set = new Set();
          gameSubs.set(gameId, set);
        }
        set.add(cb);
        cb(games.get(gameId) ?? null);
        return () => set!.delete(cb);
      },
      subscribeList(cb): Unsubscribe {
        listSubs.add(cb);
        cb(Array.from(games.values()).filter((g) => g.active));
        return () => listSubs.delete(cb);
      },
    },
  };
}
