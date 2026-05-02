import Link from "next/link";
import { login } from "./actions";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#0d1117] text-[#f4efe6] flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8">
        
        <h1 className="text-2xl font-semibold">Sign in</h1>

        <p className="mt-2 text-sm text-neutral-400">
          Enter your account information
        </p>

        <form action={login} className="mt-6 space-y-4">
          
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white"
          />

          <input
            name="password"
            type="password"
            required
            placeholder="Password"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white"
          />

          <button
            type="submit"
            className="w-full rounded-full bg-[#d8b36a] px-4 py-3 text-black font-semibold"
          >
            Sign In
          </button>
        </form>

        <div className="mt-6 text-sm text-center text-neutral-400">
          No account?{" "}
          <Link href="/auth/signup" className="text-[#d8b36a]">
            Register
          </Link>
        </div>

      </div>
    </main>
  );
}