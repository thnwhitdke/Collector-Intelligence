"use client";

import { useState } from "react";
import { createClient } from "../../src/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) return setMsg(error.message);

    // since confirm email is disabled, this should sign them in immediately
    router.push("/");
    router.refresh();
  }

  return (
    <main style={{ padding: 24, maxWidth: 420 }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Create account</h1>

      <form onSubmit={signUp} style={{ display: "grid", gap: 10 }}>
        <input
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          placeholder="password (min 6 chars)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        <button type="submit">Sign up</button>
      </form>

      <p style={{ marginTop: 12 }}>
        Already have an account? <a href="/auth/login">Login</a>
      </p>

      {msg && <p style={{ marginTop: 12, color: "crimson" }}>{msg}</p>}
    </main>
  );
}
