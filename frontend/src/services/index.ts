import { createRealServices } from "./real";
import type { Services } from "./types";

let _services: Services | null = null;

export function getServices(): Services {
  if (!_services) _services = createRealServices();
  return _services;
}

export const services: Services = new Proxy({} as Services, {
  get(_t, prop) {
    return getServices()[prop as keyof Services];
  },
});

export * from "./types";
