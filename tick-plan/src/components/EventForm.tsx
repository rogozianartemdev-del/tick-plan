"use client";

import { useEffect, useState, useTransition } from "react";
import { addHours, format } from "date-fns";
import { toast } from "sonner";
import type { Event as EventModel, Importance } from "@prisma/client";
import { createEvent, deleteEvent, updateEvent } from "@/src/actions/events";
import { IMPORTANCE, IMPORTANCE_VALUES } from "@/src/lib/importance";

type Props = { event?: EventModel; date?: Date; onClose: () => void };

export default function EventForm({ event, date, onClose }: Props) {
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const [confirmDelete, setConfirmDelete] = useState(false);

    const toInput = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");
    const initialStart = event?.date ?? date ?? new Date();
    const initialEnd = event?.endDate ?? null;

    const [start, setStart] = useState(toInput(initialStart));
    const [end, setEnd] = useState(initialEnd ? toInput(initialEnd) : "");
    const [endTouched, setEndTouched] = useState(Boolean(initialEnd));
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    function onStartChange(value: string) {
        setStart(value);
        const startDate = new Date(value);
        if (Number.isNaN(startDate.getTime())) return;
        const endDate = end ? new Date(end) : null;
        const endIsInvalid = !endDate || Number.isNaN(endDate.getTime()) || endDate <= startDate;
        if (!endTouched || endIsInvalid) {
            setEnd(toInput(addHours(startDate, 1)));
        }
    }

    function onEndChange(value: string) {
        setEnd(value);
        setEndTouched(true);
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        const fd = new FormData(e.currentTarget);

        const startDate = new Date(start);
        if (!start || Number.isNaN(startDate.getTime())) {
            setError("Некоректна дата початку");
            return;
        }

        const endDate = end ? new Date(end) : null;
        if (endDate && Number.isNaN(endDate.getTime())) {
            setError("Некоректна дата завершення");
            return;
        }
        if (endDate && endDate <= startDate) {
            setError("Завершення має бути пізніше початку");
            return;
        }

        const data = {
            title: String(fd.get("title") ?? ""),
            description: String(fd.get("description") ?? ""),
            date: startDate.toISOString(),
            endDate: endDate ? endDate.toISOString() : undefined,
            importance: String(fd.get("importance") ?? "NORMAL"),
        };

        startTransition(async () => {
            const res = event ? await updateEvent(event.id, data) : await createEvent(data);
            if ("error" in res) {
                setError(res.error);
                return;
            }
            toast.success(event ? "Подію оновлено" : "Подію створено");
            onClose();
        });
    }

    function handleDelete() {
        startTransition(async () => {
            const res = await deleteEvent(event!.id);
            if ("error" in res) {
                setError(res.error);
                return;
            }
            toast.success("Подію видалено");
            onClose();
        });
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                className="w-full max-w-md rounded-lg bg-white p-5"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="mb-3 text-lg font-semibold">
                    {confirmDelete ? "Підтвердження видалення" : event ? "Редагувати подію" : "Нова подія"}
                </h3>

                {confirmDelete ? (
                    <div className="space-y-4">
                        <p>Видалити подію «{event!.title}»? Цю дію неможливо скасувати.</p>
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        <div className="flex justify-end gap-2">
                            <button className="rounded border px-3 py-2" onClick={() => setConfirmDelete(false)}>
                                Скасувати
                            </button>
                            <button
                                disabled={pending}
                                onClick={handleDelete}
                                className="rounded bg-red-600 px-3 py-2 text-white disabled:opacity-50"
                            >
                                {pending ? "Видалення..." : "Видалити"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <input
                            name="title"
                            defaultValue={event?.title}
                            placeholder="Назва події"
                            required
                            maxLength={120}
                            className="w-full rounded border px-3 py-2"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <label className="text-sm">
                                <span className="mb-1 block text-gray-600">Початок</span>
                                <input
                                    type="datetime-local"
                                    value={start}
                                    onChange={(e) => onStartChange(e.target.value)}
                                    required
                                    className="w-full rounded border px-3 py-2"
                                />
                            </label>
                            <label className="text-sm">
                                <span className="mb-1 block text-gray-600">Завершення (необов'язково)</span>
                                <input
                                    type="datetime-local"
                                    value={end}
                                    min={start}
                                    onChange={(e) => onEndChange(e.target.value)}
                                    className="w-full rounded border px-3 py-2"
                                />
                            </label>
                        </div>
                        <textarea
                            name="description"
                            defaultValue={event?.description ?? ""}
                            placeholder="Опис"
                            rows={3}
                            maxLength={2000}
                            className="w-full rounded border px-3 py-2"
                        />
                        <select
                            name="importance"
                            defaultValue={event?.importance ?? "NORMAL"}
                            className="w-full rounded border px-3 py-2"
                        >
                            {IMPORTANCE_VALUES.map((value: Importance) => (
                                <option key={value} value={value}>
                                    {IMPORTANCE[value].label}
                                </option>
                            ))}
                        </select>

                        {error && <p className="text-sm text-red-600">{error}</p>}

                        <div className="flex items-center justify-between pt-1">
                            {event ? (
                                <button type="button" className="text-red-600" onClick={() => setConfirmDelete(true)}>
                                    Видалити
                                </button>
                            ) : (
                                <span />
                            )}
                            <div className="flex gap-2">
                                <button type="button" className="rounded border px-3 py-2" onClick={onClose}>
                                    Скасувати
                                </button>
                                <button
                                    disabled={pending}
                                    className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
                                >
                                    {pending ? "Збереження..." : "Зберегти"}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}