import type { DirName } from "./engine";

const KEY_DIRECTIONS: Record<string, DirName> = {
  arrowup: "up",
  w: "up",
  keyw: "up",
  arrowdown: "down",
  s: "down",
  keys: "down",
  arrowleft: "left",
  a: "left",
  keya: "left",
  arrowright: "right",
  d: "right",
  keyd: "right",
};

export function directionFromKeyboardEvent(
  event: Pick<KeyboardEvent, "key" | "code">,
): DirName | undefined {
  return KEY_DIRECTIONS[event.key.toLowerCase()] ?? KEY_DIRECTIONS[event.code.toLowerCase()];
}
