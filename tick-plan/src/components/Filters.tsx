"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import EventForm from "./EventForm";

type Props = { view: "calendar" | "list"; importance: string; q: string };

export default function Filters({ view, importance, q }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [text, setText] = useState(q);
  const [creating, setCreating] = useState(false);

  function update(patch: Record<string, string>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value && value !== "ALL") next.set(key, value);
      else next.delete(key);
    }
    router.replace(`/?${next.toString()}`, { scroll: false });
  }

  useEffect(() => {
    if (text === q) return;
    const timer = setTimeout(() => update({ q: text.trim() }), 400);
    return () => clearTimeout(timer);
  }, [text]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Пошук за назвою або описом..."
        className="min-w-48 flex-1 rounded border bg-white px-3 py-2"
      />

      <select
        value={importance}
        onChange={(e) => update({ importance: e.target.value })}
        className="rounded border bg-white px-3 py-2"
      >
        <option value="ALL">Усі події</option>
        <option value="NORMAL">Звичайні</option>
        <option value="IMPORTANT">Важливі</option>
        <option value="CRITICAL">Критичні</option>
      </select>

      <div className="flex overflow-hidden rounded border bg-white">
        {(["calendar", "list"] as const).map((v) => (
          <button
            key={v}
            onClick={() => update({ view: v === "calendar" ? "" : v })}
            className={`px-3 py-2 ${view === v ? "bg-black text-white" : "hover:bg-gray-100"}`}
          >
            {v === "calendar" ? "Календар" : "Список"}
          </button>
        ))}
      </div>

      <button onClick={() => setCreating(true)} className="rounded bg-blue-600 px-3 py-2 text-white">
        + Нова подія
      </button>

      {creating && <EventForm onClose={() => setCreating(false)} />}
    </div>
  );
}