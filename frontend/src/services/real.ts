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

const TOKEN_KEY = "snake_auth_token";
const USER_KEY = "snake_auth_user";

interface ErrorResponse {
  message?: string;
}

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readJson<T>(key: string): T | null {
  const storage = browserStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  const storage = browserStorage();
  if (storage) storage.setItem(key, JSON.stringify(value));
}

function removeStoredAuth(): void {
  const storage = browserStorage();
  if (!storage) return;
  storage.removeItem(TOKEN_KEY);
  storage.removeItem(USER_KEY);
}

function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
}

function apiUrl(path: string): string {
  return `${apiBaseUrl()}${path}`;
}

async function parseError(response: Response): Promise<Error> {
  try {
    const body = (await response.json()) as ErrorResponse;
    if (body.message) return new Error(body.message);
  } catch {
    /* fall through */
  }
  return new Error(`Request failed (${response.status})`);
}

export function createRealServices(): Services {
  const authSubs = new Set<(u: User | null) => void>();
  let current = readJson<User>(USER_KEY);
  let token = browserStorage()?.getItem(TOKEN_KEY) ?? null;
  let loadedMe = false;

  function setCurrent(user: User | null): void {
    current = user;
    if (user) writeJson(USER_KEY, user);
    else removeStoredAuth();
    authSubs.forEach((cb) => cb(user));
  }

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);

    const response = await fetch(apiUrl(path), {
      ...init,
      headers,
      credentials: "include",
    });

    const nextToken = response.headers.get("X-Auth-Token");
    if (nextToken) {
      token = nextToken;
      browserStorage()?.setItem(TOKEN_KEY, nextToken);
    }

    if (!response.ok) throw await parseError(response);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  async function loadCurrentUser(): Promise<void> {
    if (loadedMe) return;
    loadedMe = true;
    try {
      setCurrent(await request<User>("/api/auth/me"));
    } catch {
      setCurrent(null);
    }
  }

  function eventSource(path: string): EventSource {
    return new EventSource(apiUrl(path), { withCredentials: true });
  }

  function listLiveGames(): Promise<LiveGame[]> {
    return request<LiveGame[]>("/api/live/games");
  }

  async function getLiveGame(gameId: string): Promise<LiveGame | null> {
    try {
      return await request<LiveGame>(`/api/live/games/${encodeURIComponent(gameId)}`);
    } catch {
      return null;
    }
  }

  if (typeof window !== "undefined") {
    void loadCurrentUser();
  }

  return {
    auth: {
      async signup(credentials: AuthCredentials) {
        const user = await request<User>("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify(credentials),
        });
        setCurrent(user);
        return user;
      },
      async login(credentials: AuthCredentials) {
        const user = await request<User>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify(credentials),
        });
        setCurrent(user);
        return user;
      },
      async logout() {
        try {
          await request<void>("/api/auth/logout", { method: "POST" });
        } finally {
          setCurrent(null);
        }
      },
      currentUser() {
        return current;
      },
      onAuthChange(cb) {
        authSubs.add(cb);
        cb(current);
        void loadCurrentUser();
        return () => authSubs.delete(cb);
      },
    },
    scores: {
      submit(mode, score) {
        return request<Score>("/api/scores", {
          method: "POST",
          body: JSON.stringify({ mode, score }),
        });
      },
      top(mode, limit = 10) {
        const params = new URLSearchParams({ mode, limit: String(limit) });
        return request<Score[]>(`/api/scores?${params}`);
      },
    },
    live: {
      start(mode, snapshot) {
        return request<LiveGame>("/api/live/games", {
          method: "POST",
          body: JSON.stringify({ mode, snapshot }),
        });
      },
      tick(gameId, snapshot) {
        return request<void>(`/api/live/games/${encodeURIComponent(gameId)}/snapshot`, {
          method: "PUT",
          body: JSON.stringify({ snapshot }),
        });
      },
      end(gameId, finalScore) {
        return request<void>(`/api/live/games/${encodeURIComponent(gameId)}/end`, {
          method: "POST",
          body: JSON.stringify({ finalScore }),
        });
      },
      list: listLiveGames,
      get: getLiveGame,
      subscribe(gameId, cb): Unsubscribe {
        void getLiveGame(gameId).then(cb);
        const source = eventSource(`/api/live/games/${encodeURIComponent(gameId)}/stream`);
        source.onmessage = (event) => cb(JSON.parse(event.data) as LiveGame | null);
        source.onerror = () => {
          if (source.readyState === EventSource.CLOSED) cb(null);
        };
        return () => source.close();
      },
      subscribeList(cb): Unsubscribe {
        void listLiveGames().then(cb);
        const source = eventSource("/api/live/games/stream");
        source.onmessage = (event) => cb(JSON.parse(event.data) as LiveGame[]);
        return () => source.close();
      },
    },
  };
}
