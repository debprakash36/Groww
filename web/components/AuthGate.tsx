"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { TOKEN_KEY, UNAUTHORIZED_EVENT, storeToken } from "@/lib/auth";
import { UNREACHABLE_MESSAGE, apiFetch, isUnreachable } from "@/lib/api";
import styles from "./AuthGate.module.css";

type Mode = "checking" | "open" | "login" | "in" | "unreachable";

/**
 * Asks for the API token when the server requires one.
 *
 * The token stays in sessionStorage and is attached by `apiFetch`. A later 401
 * (expired session, token rotated) drops back to this form.
 *
 * A network failure must not open the app: that is what produced a later
 * "Failed to fetch" on chat send when the API origin was wrong or still waking.
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("checking");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const probe = useCallback(async () => {
    setMode("checking");
    setError(null);
    try {
      const body = await apiFetch<{ required?: boolean }>("/auth/status");
      if (!body.required) {
        setMode("open");
        return;
      }
      setMode(sessionStorage.getItem(TOKEN_KEY) ? "in" : "login");
    } catch (e) {
      if (isUnreachable(e)) {
        setError(UNREACHABLE_MESSAGE);
        setMode("unreachable");
        return;
      }
      setError(e instanceof Error ? e.message : UNREACHABLE_MESSAGE);
      setMode("unreachable");
    }
  }, []);

  useEffect(() => {
    const showLogin = () => {
      setMode("login");
      setError(null);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, showLogin);
    void probe();
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, showLogin);
  }, [probe]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      storeToken(token);
      setToken("");
      setMode("in");
    } catch (e) {
      setError(
        isUnreachable(e)
          ? UNREACHABLE_MESSAGE
          : e instanceof Error
            ? e.message
            : "Sign-in failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (mode === "checking") {
    return <p className="muted">Checking access…</p>;
  }
  if (mode === "unreachable") {
    return (
      <main className={styles.wrap}>
        <h2>Can’t reach the API</h2>
        <p className="muted">{error ?? UNREACHABLE_MESSAGE}</p>
        <button type="button" className="primary" onClick={() => void probe()}>
          Retry
        </button>
      </main>
    );
  }
  if (mode === "login") {
    return (
      <main className={styles.wrap}>
        <h2>Sign in</h2>
        <p className="muted">Enter the access token for this chatbot.</p>
        <form className={styles.form} onSubmit={(e) => void submit(e)}>
          <label>
            Access token
            <input
              type="password"
              autoComplete="current-password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
          </label>
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          <button type="submit" className="primary" disabled={busy || !token.trim()}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </main>
    );
  }
  return <>{children}</>;
}
