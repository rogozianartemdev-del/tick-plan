"use client";

import { signOut } from "next-auth/react";

export default function Header({ name, email }: { name: string; email: string }) {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
        <span className="text-lg font-semibold">TickPlan</span>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-gray-600 sm:inline">{name || email}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded border px-3 py-1.5 hover:bg-gray-100"
          >
            Вийти
          </button>
        </div>
      </div>
    </header>
  );
}