import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { ItemTable } from "../features/items/ItemTable";
import { supabase } from "../lib/supabase";

const AuthScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }

    setBusy(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (signInError) {
      setError(signInError.message);
    }

    setBusy(false);
  };

  return (
    <section className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -right-20 -top-[60px] h-60 w-60 rounded-full bg-[rgba(168,123,81,0.2)] blur-[2px]" />
      <div className="pointer-events-none absolute -left-[90px] bottom-10 h-[280px] w-[280px] rounded-full bg-[rgba(30,41,59,0.08)] blur-[2px]" />

      <div className="relative z-[1] mx-auto grid max-w-[780px] gap-3">
        <header className="grid gap-3 rounded-[20px] border border-[var(--border)] bg-[var(--panel)] p-[18px] shadow-[var(--shadow)] backdrop-blur-[12px]">
          <div className="grid max-w-[680px] gap-1">
            <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#8d6743]">Workspace</p>
            <h1 className="m-0 text-[clamp(2rem,3.6vw,3.6rem)] leading-none tracking-[-0.05em]">Sign in</h1>
          </div>
        </header>

        <Card className="grid gap-3 rounded-[18px] p-[18px]">
          <CardHeader className="grid gap-0">
            <CardTitle>Team sign in</CardTitle>
          </CardHeader>

          <CardContent className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-[0.84rem] font-bold text-[var(--muted)]">Email</span>
              <Input
                autoComplete="email"
                placeholder="name@company.com"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-[0.84rem] font-bold text-[var(--muted)]">Password</span>
              <Input
                autoComplete="current-password"
                placeholder="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void handleSubmit();
                  }
                }}
              />
            </label>

            {error ? <div className="rounded-2xl border border-[rgba(167,58,42,0.22)] bg-[#f8ddd5] px-4 py-3.5 text-[#7b2317]">{error}</div> : null}

            <Button type="button" onClick={() => void handleSubmit()} disabled={busy}>
              {busy ? "Signing in..." : "Sign in"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export const HomePage = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) {
        return;
      }

      setSession(data.session ?? null);
      setLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <section className="relative min-h-screen overflow-hidden">
        <div className="pointer-events-none absolute -right-20 -top-[60px] h-60 w-60 rounded-full bg-[rgba(168,123,81,0.2)] blur-[2px]" />
        <div className="pointer-events-none absolute -left-[90px] bottom-10 h-[280px] w-[280px] rounded-full bg-[rgba(30,41,59,0.08)] blur-[2px]" />

        <div className="relative z-[1] mx-auto max-w-[780px]">
          <Card className="rounded-[18px] p-[18px]">
            <CardContent className="py-1.5 text-[var(--muted)]">Loading session...</CardContent>
          </Card>
        </div>
      </section>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <ItemTable
      accessToken={session.access_token}
      viewerEmail={session.user.email ?? "Signed in user"}
      onSignOut={() => void supabase.auth.signOut()}
    />
  );
};

export default HomePage;
