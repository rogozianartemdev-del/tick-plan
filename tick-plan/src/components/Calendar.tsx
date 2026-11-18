"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar as BigCalendar, dateFnsLocalizer, type View } from "react-big-calendar";
import { addHours, format, getDay, parse, startOfWeek } from "date-fns";
import { uk } from "date-fns/locale";
import type { Event as EventModel } from "@prisma/client";
import EventForm from "./EventForm";
import { IMPORTANCE } from "@/src/lib/importance";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { getEventEnd } from "../lib/eventTime";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales: { uk },
});

const messages = {
  today: "Сьогодні",
  previous: "←",
  next: "→",
  month: "Місяць",
  week: "Тиждень",
  day: "День",
  date: "Дата",
  time: "Час",
  event: "Подія",
  noEventsInRange: "У цьому діапазоні подій немає",
  showMore: (count: number) => `+ ще ${count}`,
};

type Props = { events: EventModel[]; date: string };

export default function Calendar({ events, date }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<View>("month");
  const [form, setForm] = useState<{ date?: Date; event?: EventModel } | null>(null);

  useEffect(() => {
    setMounted(true);
    if (window.innerWidth < 640) setView("day");
  }, []);

  const currentDate = useMemo(() => parse(date, "yyyy-MM-dd", new Date()), [date]);

  const items = useMemo(
    () =>
      events.map((e) => ({
        id: e.id,
        title: e.title,
        start: e.date,
        end: getEventEnd(e),
        raw: e,
      })),
    [events]
  );

  function onNavigate(next: Date) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", format(next, "yyyy-MM-dd"));
    router.replace(`/?${params.toString()}`, { scroll: false });
  }

  if (!mounted) {
    return <div className="h-[75vh] animate-pulse rounded-lg bg-gray-200" />;
  }

  return (
    <>
      <div className="h-[75vh] rounded-lg border bg-white p-3">
        <BigCalendar
          localizer={localizer}
          culture="uk"
          messages={messages}
          events={items}
          date={currentDate}
          onNavigate={onNavigate}
          view={view}
          onView={setView}
          views={["month", "week", "day"]}
          selectable
          popup
          onSelectSlot={({ start }) => {
            const slot = new Date(start);
            if (slot.getHours() === 0 && slot.getMinutes() === 0) slot.setHours(9);
            setForm({ date: slot });
          }}
          onSelectEvent={(item) => setForm({ event: item.raw })}
          eventPropGetter={(item) => ({
            style: { backgroundColor: IMPORTANCE[item.raw.importance].color, border: "none" },
          })}
        />
      </div>

      {form && <EventForm {...form} onClose={() => setForm(null)} />}
    </>
  );
}