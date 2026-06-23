import { createMockServices } from "./mock";
import type { Services } from "./types";

// Singleton service instance. Swap createMockServices() for a real
// implementation later — every component imports from here only.
let _services: Services | null = null;

export function getServices(): Services {
  if (!_services) _services = createMockServices();
  return _services;
}

export const services: Services = new Proxy({} as Services, {
  get(_t, prop) {
    return getServices()[prop as keyof Services];
  },
});

export * from "./types";
