import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("../lib/prisma", () => ({
  prisma: {
    event: {
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));


import { createEvent, deleteEvent, getEvents, updateEvent } from "./events";
import { getSession } from "../lib/auth";
import { prisma } from "../lib/prisma";

const validInput = { title: "Зустріч", date: "2026-11-20T10:00:00.000Z", importance: "IMPORTANT" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSession).mockResolvedValue({ user: { id: "u1" } } as never);
});

describe("events actions", () => {
  it("кидає помилку без сесії", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    await expect(createEvent(validInput)).rejects.toThrow("Unauthorized");
  });

  it("створює подію для поточного користувача", async () => {
    const res = await createEvent(validInput);
    expect(res).toEqual({ ok: true });
    expect(prisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "u1", title: "Зустріч" }) })
    );
  });

  it("повертає помилку валідації й не пише в БД", async () => {
    const res = await createEvent({ ...validInput, title: "" });
    expect(res).toHaveProperty("error");
    expect(prisma.event.create).not.toHaveBeenCalled();
  });

  it("getEvents завжди фільтрує по userId та важливості", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValue([]);
    await getEvents({ importance: "CRITICAL", q: "звіт" });
    const arg = vi.mocked(prisma.event.findMany).mock.calls[0][0]!;
    expect(arg.where).toMatchObject({ userId: "u1", importance: "CRITICAL" });
    expect(arg.where?.OR).toHaveLength(2);
  });

  it("updateEvent не змінює чужі події", async () => {
    vi.mocked(prisma.event.updateMany).mockResolvedValue({ count: 0 });
    const res = await updateEvent("e1", validInput);
    expect(res).toEqual({ error: "Подію не знайдено" });
    expect(prisma.event.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "e1", userId: "u1" } })
    );
  });

  it("deleteEvent видаляє тільки власні події", async () => {
    vi.mocked(prisma.event.deleteMany).mockResolvedValue({ count: 1 });
    expect(await deleteEvent("e1")).toEqual({ ok: true });
    expect(prisma.event.deleteMany).toHaveBeenCalledWith({ where: { id: "e1", userId: "u1" } });
  });
});