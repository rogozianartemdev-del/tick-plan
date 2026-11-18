"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { registerUser } from "../actions/auth";


export default function RegisterForm() {
    const router = useRouter();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        setLoading(true);
        const fd = new FormData(e.currentTarget);
        const data = {
            name: fd.get("name"),
            email: fd.get("email"),
            password: fd.get("password"),
        };

        const res = await registerUser(data);
        if ("error" in res) {
            setError(res.error);
            setLoading(false);
            return;
        }

        const login = await signIn("credentials", {
            email: data.email,
            password: data.password,
            redirect: false,
        });
        setLoading(false);

        if (login?.error) {
            router.push("/login");
            return;
        }
        router.push("/");
        router.refresh();
    }

    return (
        <div className="mx-auto mt-24 w-full max-w-sm space-y-4 rounded-lg border bg-white p-6">
            <h1 className="text-xl font-semibold">Реєстрація</h1>

            <form onSubmit={onSubmit} className="space-y-3">
                <input name="name" placeholder="Ім'я" required className="w-full rounded border px-3 py-2" />
                <input name="email" type="email" placeholder="Email" required
                    className="w-full rounded border px-3 py-2" />
                <input name="password" type="password" placeholder="Пароль (мін. 6 символів)" required minLength={6}
                    className="w-full rounded border px-3 py-2" />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button disabled={loading}
                    className="w-full rounded bg-black py-2 text-white disabled:opacity-50">
                    {loading ? "Створення..." : "Зареєструватися"}
                </button>
            </form>

            <button onClick={() => signIn("google", { callbackUrl: "/" })}
                className="w-full rounded border py-2 hover:bg-gray-50">
                Продовжити через Google
            </button>

            <p className="text-sm text-gray-600">
                Вже є акаунт? <Link href="/login" className="underline">Увійти</Link>
            </p>
        </div>
    );
}