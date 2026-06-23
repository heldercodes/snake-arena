import { describe, expect, it } from "vitest";
import { directionFromKeyboardEvent } from "./input";

function keyEvent(key: string, code = ""): Pick<KeyboardEvent, "key" | "code"> {
  return { key, code };
}

describe("keyboard input", () => {
  it("maps arrow keys to directions", () => {
    expect(directionFromKeyboardEvent(keyEvent("ArrowUp"))).toBe("up");
    expect(directionFromKeyboardEvent(keyEvent("ArrowDown"))).toBe("down");
    expect(directionFromKeyboardEvent(keyEvent("ArrowLeft"))).toBe("left");
    expect(directionFromKeyboardEvent(keyEvent("ArrowRight"))).toBe("right");
  });

  it("maps WASD by key value", () => {
    expect(directionFromKeyboardEvent(keyEvent("w"))).toBe("up");
    expect(directionFromKeyboardEvent(keyEvent("S"))).toBe("down");
    expect(directionFromKeyboardEvent(keyEvent("a"))).toBe("left");
    expect(directionFromKeyboardEvent(keyEvent("D"))).toBe("right");
  });

  it("maps WASD by physical key code", () => {
    expect(directionFromKeyboardEvent(keyEvent("z", "KeyW"))).toBe("up");
    expect(directionFromKeyboardEvent(keyEvent("o", "KeyS"))).toBe("down");
    expect(directionFromKeyboardEvent(keyEvent("q", "KeyA"))).toBe("left");
    expect(directionFromKeyboardEvent(keyEvent("e", "KeyD"))).toBe("right");
  });
});
