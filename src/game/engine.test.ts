import { describe, expect, it } from "vitest";
import { createState, step, turn } from "./engine";

describe("snake engine", () => {
  it("moves the head in current direction", () => {
    const s0 = createState("walls", 10);
    const s1 = step(s0);
    expect(s1.snake[0].x).toBe(s0.snake[0].x + 1);
    expect(s1.snake.length).toBe(s0.snake.length);
  });

  it("dies on wall in walls mode", () => {
    let s = createState("walls", 5);
    s = { ...s, snake: [{ x: 4, y: 2 }], dir: { x: 1, y: 0 } };
    const out = step(s);
    expect(out.over).toBe(true);
  });

  it("wraps around edges in wrap mode", () => {
    let s = createState("wrap", 5);
    s = { ...s, snake: [{ x: 4, y: 2 }], dir: { x: 1, y: 0 }, food: { x: 0, y: 0 } };
    const out = step(s);
    expect(out.over).toBe(false);
    expect(out.snake[0]).toEqual({ x: 0, y: 2 });
  });

  it("grows and increments score when eating food", () => {
    let s = createState("wrap", 10);
    s = { ...s, snake: [{ x: 2, y: 2 }, { x: 1, y: 2 }], dir: { x: 1, y: 0 }, food: { x: 3, y: 2 } };
    const out = step(s);
    expect(out.snake.length).toBe(3);
    expect(out.score).toBe(1);
  });

  it("dies on self collision", () => {
    let s = createState("wrap", 10);
    s = {
      ...s,
      snake: [
        { x: 2, y: 2 },
        { x: 2, y: 3 },
        { x: 3, y: 3 },
        { x: 3, y: 2 },
      ],
      dir: { x: 1, y: 0 },
    };
    // turn down so head moves into (2,3) which is already body
    const turned = turn(s, { x: 0, y: 1 });
    const out = step(turned);
    expect(out.over).toBe(true);
  });

  it("refuses to reverse direction directly", () => {
    const s = createState("wrap", 10); // dir +x
    const turned = turn(s, { x: -1, y: 0 });
    expect(turned.dir).toEqual({ x: 1, y: 0 });
  });
});
