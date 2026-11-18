import { getEvents } from "@/src/actions/events";
import Calendar from "@/src/components/Calendar";
import EventList from "@/src/components/EventList";
import Filters from "@/src/components/Filters";
import { IMPORTANCE_VALUES } from "@/src/lib/importance";
import { Importance } from "@prisma/client";
import {
    addDays, endOfMonth, endOfWeek, format, isValid, parse, startOfMonth, startOfWeek, subDays,
} from "date-fns";



type SearchParams = { view?: string; importance?: string; q?: string; date?: string };

export default async function HomePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const sp = await searchParams;
    const view = sp.view === "list" ? "list" : "calendar";
    const importance: Importance | "ALL" = IMPORTANCE_VALUES.includes(sp.importance as Importance)
        ? (sp.importance as Importance)
        : "ALL";

    const q = sp.q ?? "";
    const parsed = sp.date ? parse(sp.date, "yyyy-MM-dd", new Date()) : new Date();
    const date = isValid(parsed) ? parsed : new Date();
    const range = view === "calendar" ? {
        from: subDays(startOfWeek(startOfMonth(date), { weekStartsOn: 1 }), 1).toISOString(),
        to: addDays(endOfWeek(endOfMonth(date), { weekStartsOn: 1 }), 1).toISOString(),
    } : {};

    const events = await getEvents({ importance, q, ...range });

    return (
        <main className="mx-auto max-w-6xl space-y-4 p-4">
            <Filters view={view} importance={importance} q={q} />
            {view === "calendar" ? (
                <Calendar events={events} date={format(date, "yyyy-MM-dd")} />
            ) : (
                <EventList events={events} />
            )}
        </main>
    )

}