import { useEffect, useState } from "react";
import { services } from "../services";
import type { User } from "../services/types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => services.auth.currentUser());
  useEffect(() => services.auth.onAuthChange(setUser), []);
  return user;
}
