export type GameMode = "walls" | "wrap";

export interface User {
  id: string;
  username: string;
}

export interface Score {
  id: string;
  userId: string;
  username: string;
  mode: GameMode;
  score: number;
  createdAt: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface GameSnapshot {
  size: number;
  snake: Point[];
  food: Point;
  dir: Point;
  score: number;
  mode: GameMode;
  over: boolean;
}

export interface LiveGame {
  id: string;
  userId: string;
  username: string;
  mode: GameMode;
  startedAt: number;
  snapshot: GameSnapshot;
  active: boolean;
}

export interface AuthCredentials {
  username: string;
  password: string;
}

export type Unsubscribe = () => void;

export interface Services {
  auth: {
    signup(c: AuthCredentials): Promise<User>;
    login(c: AuthCredentials): Promise<User>;
    logout(): Promise<void>;
    currentUser(): User | null;
    onAuthChange(cb: (u: User | null) => void): Unsubscribe;
  };
  scores: {
    submit(mode: GameMode, score: number): Promise<Score>;
    top(mode: GameMode, limit?: number): Promise<Score[]>;
  };
  live: {
    start(mode: GameMode, snapshot: GameSnapshot): Promise<LiveGame>;
    tick(gameId: string, snapshot: GameSnapshot): Promise<void>;
    end(gameId: string, finalScore: number): Promise<void>;
    list(): Promise<LiveGame[]>;
    get(gameId: string): Promise<LiveGame | null>;
    subscribe(gameId: string, cb: (g: LiveGame | null) => void): Unsubscribe;
    subscribeList(cb: (games: LiveGame[]) => void): Unsubscribe;
  };
}
