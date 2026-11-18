"use server";

import bcrypt from "bcryptjs";
import { registerSchema } from "../lib/validation";
import { prisma } from "../lib/prisma";


export async function registerUser(input: unknown): Promise<{ ok: true } | { error: string }> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { name, email, password } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: "Користувач з таким email вже існує" };

  await prisma.user.create({
    data: { name, email, password: await bcrypt.hash(password, 10) },
  });

  return { ok: true };
}