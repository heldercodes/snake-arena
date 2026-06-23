import type { GameMode, GameSnapshot, Point } from "../services/types";

export const DEFAULT_SIZE = 20;

const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
export type DirName = keyof typeof DIRS;

export function dirVec(name: DirName): Point {
  return DIRS[name];
}

function randomFood(size: number, occupied: Point[]): Point {
  const set = new Set(occupied.map((p) => `${p.x},${p.y}`));
  // simple retry
  for (let i = 0; i < 200; i++) {
    const p = { x: Math.floor(Math.random() * size), y: Math.floor(Math.random() * size) };
    if (!set.has(`${p.x},${p.y}`)) return p;
  }
  return { x: 0, y: 0 };
}

export function createState(mode: GameMode, size = DEFAULT_SIZE): GameSnapshot {
  const mid = Math.floor(size / 2);
  const snake: Point[] = [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];
  return {
    size,
    snake,
    food: randomFood(size, snake),
    dir: { x: 1, y: 0 },
    score: 0,
    mode,
    over: false,
  };
}

export function turn(state: GameSnapshot, next: Point): GameSnapshot {
  // disallow reversing into self
  if (state.snake.length > 1 && next.x === -state.dir.x && next.y === -state.dir.y) return state;
  return { ...state, dir: next };
}

export function step(state: GameSnapshot): GameSnapshot {
  if (state.over) return state;
  const head = state.snake[0];
  let nx = head.x + state.dir.x;
  let ny = head.y + state.dir.y;

  if (state.mode === "wrap") {
    nx = (nx + state.size) % state.size;
    ny = (ny + state.size) % state.size;
  } else if (nx < 0 || ny < 0 || nx >= state.size || ny >= state.size) {
    return { ...state, over: true };
  }

  const ateFood = nx === state.food.x && ny === state.food.y;
  const newHead = { x: nx, y: ny };
  const newSnake = [newHead, ...state.snake];
  if (!ateFood) newSnake.pop();

  // self-collision (after move)
  for (let i = 1; i < newSnake.length; i++) {
    if (newSnake[i].x === newHead.x && newSnake[i].y === newHead.y) {
      return { ...state, snake: newSnake, over: true };
    }
  }

  return {
    ...state,
    snake: newSnake,
    food: ateFood ? randomFood(state.size, newSnake) : state.food,
    score: ateFood ? state.score + 1 : state.score,
  };
}

export function isGameOver(s: GameSnapshot): boolean {
  return s.over;
}
