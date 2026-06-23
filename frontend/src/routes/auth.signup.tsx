import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { services } from "../services";
import { AuthShell, Field } from "./auth.login";

export const Route = createFileRoute("/auth/signup")({
  head: () => ({ meta: [{ title: "Sign up — Snake.OS" }] }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await services.auth.signup({ username, password });
      navigate({ to: "/" });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="SIGN UP">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Username" value={username} onChange={setU} autoFocus />
        <Field label="Password" type="password" value={password} onChange={setP} />
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button
          disabled={busy}
          className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "..." : "Create account"}
        </button>
        <p className="text-center text-xs text-muted-foreground">
          Have an account?{" "}
          <Link to="/auth/login" className="text-primary underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
