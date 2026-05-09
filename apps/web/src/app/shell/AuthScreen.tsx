import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { useAuth } from "../auth/AuthProvider";

export const AuthScreen = () => {
  const { t } = useTranslation(["auth", "common", "errors"]);
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError(t("errors:missingCredentials"));
      return;
    }

    setBusy(true);
    setError(null);
    const nextError = await signIn(email, password);
    setError(nextError);
    setBusy(false);
  };

  return (
    <section className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -right-20 -top-[60px] h-60 w-60 rounded-full bg-[rgba(168,123,81,0.2)] blur-[2px]" />
      <div className="pointer-events-none absolute -left-[90px] bottom-10 h-[280px] w-[280px] rounded-full bg-[rgba(30,41,59,0.08)] blur-[2px]" />

      <div className="relative z-[1] mx-auto grid max-w-[780px] gap-3">
        <header className="grid gap-3 rounded-[20px] border border-[var(--border)] bg-[var(--panel)] p-[18px] shadow-[var(--shadow)] backdrop-blur-[12px]">
          <div className="grid max-w-[680px] gap-1">
            <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#8d6743]">{t("auth:eyebrow")}</p>
            <h1 className="m-0 text-[clamp(2rem,3.6vw,3.6rem)] leading-none tracking-[-0.05em]">{t("auth:title")}</h1>
            <p className="m-0 max-w-[56ch] text-[0.96rem] leading-[1.5] text-[var(--muted)]">{t("auth:subtitle")}</p>
          </div>
        </header>

        <Card className="grid gap-3 rounded-[18px] p-[18px]">
          <CardHeader className="grid gap-1">
            <CardTitle>{t("common:signIn")}</CardTitle>
            <CardDescription>{t("common:appName")}</CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-[0.84rem] font-bold text-[var(--muted)]">{t("common:email")}</span>
              <Input
                autoComplete="email"
                placeholder="name@company.com"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-[0.84rem] font-bold text-[var(--muted)]">{t("common:password")}</span>
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
              {busy ? `${t("common:signIn")}...` : t("common:signIn")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
