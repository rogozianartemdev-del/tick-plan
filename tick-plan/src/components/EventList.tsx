"use client";

import { useState } from "react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import type { Event as EventModel } from "@prisma/client";
import EventForm from "./EventForm";
import { IMPORTANCE } from "@/src/lib/importance";
import { getEventEnd } from "../lib/eventTime";

export default function EventList({ events }: { events: EventModel[] }) {
    const [selected, setSelected] = useState<EventModel | null>(null);

    if (events.length === 0) {
        return (
            <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
                Подій не знайдено
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {events.map((e) => (
                <div
                    key={e.id}
                    onClick={() => setSelected(e)}
                    className="cursor-pointer rounded-lg border bg-white p-4 hover:bg-gray-50"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="truncate font-medium">{e.title}</div>
                            <time suppressHydrationWarning className="text-sm text-gray-500">
                                {format(e.date, "d MMMM yyyy, HH:mm", { locale: uk })}
                                {" – "}
                                {format(getEventEnd(e), e.endDate ? "d MMMM yyyy, HH:mm" : "HH:mm", { locale: uk })}
                            </time>
                        </div>
                        <span className={`shrink-0 rounded px-2 py-1 text-xs ${IMPORTANCE[e.importance].badge}`}>
                            {IMPORTANCE[e.importance].label}
                        </span>
                    </div>
                    {e.description && (
                        <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{e.description}</p>
                    )}
                </div>
            ))}

            {selected && <EventForm event={selected} onClose={() => setSelected(null)} />}
        </div>
    );
}