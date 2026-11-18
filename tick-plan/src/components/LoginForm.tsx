"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);

    const res = await signIn("credentials", {
      email: fd.get("email"),
      password: fd.get("password"),
      redirect: false,
    });

    setLoading(false);
    if (res?.error) {
      setError("Невірний email або пароль");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto mt-24 w-full max-w-sm space-y-4 rounded-lg border bg-white p-6">
      <h1 className="text-xl font-semibold">Вхід</h1>

      <form onSubmit={onSubmit} className="space-y-3">
        <input name="email" type="email" placeholder="Email" required
          className="w-full rounded border px-3 py-2" />
        <input name="password" type="password" placeholder="Пароль" required
          className="w-full rounded border px-3 py-2" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading}
          className="w-full rounded bg-black py-2 text-white disabled:opacity-50">
          {loading ? "Вхід..." : "Увійти"}
        </button>
      </form>

      <button onClick={() => signIn("google", { callbackUrl: "/" })}
        className="w-full rounded border py-2 hover:bg-gray-50">
        Увійти через Google
      </button>

      <p className="text-sm text-gray-600">
        Немає акаунта? <Link href="/register" className="underline">Реєстрація</Link>
      </p>
    </div>
  );
}