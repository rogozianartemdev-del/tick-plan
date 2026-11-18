"use server";

import { getSession } from "@/src/lib/auth";
import { prisma } from "../lib/prisma";
import { Importance, Prisma } from "@prisma/client";
import { IMPORTANCE_VALUES } from "../lib/importance";
import { eventSchema } from "../lib/validation";
import { revalidatePath } from "next/cache";



type Result = { ok: true } | { error: string };

async function requireUserId(): Promise<string> {
    const session = await getSession();
    if (!session?.user?.id) throw new Error("Unauthorized");
    return session.user.id;
}

export async function getEvents(
    params: { importance?: Importance | "ALL"; q?: string; from?: string; to?: string } = {}
) {
    const userId = await requireUserId();
    const where: Prisma.EventWhereInput = { userId };

    if (params.importance && IMPORTANCE_VALUES.includes(params.importance as Importance)) {
        where.importance = params.importance as Importance;
    }

    const q = params.q?.trim();
    if (q) {
        where.OR = [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
        ];
    }

    if (params.from && params.to) {
        where.date = { gte: new Date(params.from), lt: new Date(params.to) };
    }

    return prisma.event.findMany({ where, orderBy: { date: "asc" } });
}

export async function createEvent(input: unknown): Promise<Result> {
    const userId = await requireUserId();
    console.log("INPUT", input);
    const parsed = eventSchema.safeParse(input);
        if (!parsed.success){
            console.log("ZOD", parsed.error.issues);
             return { error: parsed.error.issues[0].message };
        }
    const { date,endDate, description, ...rest } = parsed.data;
    await prisma.event.create({
        data: {
             ...rest, 
             description: description || null,
              date: new Date(date),
              endDate:endDate? new Date(endDate):null, 
              userId },
    });

    revalidatePath("/");
    return { ok: true };
}

export async function updateEvent(id: string, input: unknown): Promise<Result> {
    const userId = await requireUserId();
    const parsed = eventSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const { date, endDate,description, ...rest } = parsed.data;
    const res = await prisma.event.updateMany({
        where: { id, userId },
        data: { ...rest, description: description || null, date: new Date(date),endDate: endDate ? new Date(endDate) : null, },
    });
    if (res.count === 0) return { error: "Подію не знайдено" };

    revalidatePath("/");
    return { ok: true };
}



export async function deleteEvent(id: string): Promise<Result> {
    const userId = await requireUserId();
    const res = await prisma.event.deleteMany({ where: { id, userId } });
    if (res.count === 0) return { error: "Подію не знайдено" };

    revalidatePath("/");
    return { ok: true };
}