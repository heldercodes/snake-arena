import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { services } from "../services";

export const Route = createFileRoute("/auth/login")({
  head: () => ({ meta: [{ title: "Sign in — Snake.OS" }] }),
  component: LoginPage,
});

function LoginPage() {
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
      await services.auth.login({ username, password });
      navigate({ to: "/" });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="SIGN IN">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Username" value={username} onChange={setU} autoFocus />
        <Field label="Password" type="password" value={password} onChange={setP} />
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button
          disabled={busy}
          className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "..." : "Sign in"}
        </button>
        <p className="text-center text-xs text-muted-foreground">
          No account?{" "}
          <Link to="/auth/signup" className="text-primary underline">
            Sign up
          </Link>
        </p>
        <p className="text-center text-[10px] text-muted-foreground">
          Demo accounts: neon / pixel / viper · password: <span className="mono">demo</span>
        </p>
      </form>
    </AuthShell>
  );
}

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8">
        <Link to="/" className="mono text-xs text-muted-foreground hover:text-foreground">
          ← back
        </Link>
        <h1 className="mt-4 mono text-2xl font-bold text-primary">{title}</h1>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
      />
    </label>
  );
}
