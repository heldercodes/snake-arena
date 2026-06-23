import { Link, Outlet, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useAuth } from "../hooks/useAuth";
import { services } from "../services";

export const Route = createFileRoute("/")({
  component: Layout,
});

function Layout() {
  const user = useAuth();
  const navigate = useNavigate();
  const router = useRouter();

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="mono text-xl font-bold text-primary">
            ▣ SNAKE.OS
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link to="/leaderboard" className="text-muted-foreground hover:text-foreground">
              Leaderboard
            </Link>
            <Link to="/watch" className="text-muted-foreground hover:text-foreground">
              Watch
            </Link>
            {user ? (
              <>
                <span className="mono text-xs text-primary">@{user.username}</span>
                <button
                  className="text-muted-foreground hover:text-foreground"
                  onClick={async () => {
                    await services.auth.logout();
                    router.invalidate();
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate({ to: "/auth/login" })}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                Sign in
              </button>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <Landing />
      </main>
    </div>
  );
}

function Landing() {
  const user = useAuth();
  return (
    <div className="space-y-12">
      <section className="text-center">
        <h1 className="text-5xl font-bold text-foreground">
          Eat. Grow. <span className="text-primary">Survive.</span>
        </h1>
        <p className="mt-4 text-muted-foreground">
          Classic Snake, two ways. Compete on the leaderboard. Watch live games.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <ModeCard
          mode="walls"
          title="WALLS"
          tagline="Touch a wall, you die. Old school."
        />
        <ModeCard
          mode="wrap"
          title="PASS-THROUGH"
          tagline="Edges wrap around. Pure flow."
        />
      </section>

      {!user && (
        <p className="text-center text-sm text-muted-foreground">
          <Link to="/auth/login" className="text-primary underline">Sign in</Link> or{" "}
          <Link to="/auth/signup" className="text-primary underline">create an account</Link> to play and rank.
        </p>
      )}
    </div>
  );
}

function ModeCard({
  mode,
  title,
  tagline,
}: {
  mode: "walls" | "wrap";
  title: string;
  tagline: string;
}) {
  return (
    <Link
      to="/play/$mode"
      params={{ mode }}
      className="group block rounded-xl border border-border bg-card p-8 transition hover:border-primary hover:shadow-[0_0_40px_-12px_var(--snake)]"
    >
      <div className="mono text-3xl font-bold text-primary">{title}</div>
      <p className="mt-3 text-sm text-muted-foreground">{tagline}</p>
      <div className="mt-6 text-xs text-muted-foreground group-hover:text-primary">PLAY ▸</div>
    </Link>
  );
}

// satisfy router for nested Outlet pattern not needed here
void Outlet;
