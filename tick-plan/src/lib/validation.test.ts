import { describe, expect, it } from "vitest";
import { eventSchema, registerSchema } from "./validation";

describe("eventSchema", () => {
    const valid = { title: "Зустріч", date: "2026-11-20T10:00:00.000Z", importance: "NORMAL" };

    it("приймає коректну подію", () => {
        expect(eventSchema.safeParse(valid).success).toBe(true);
    });

    it("відхиляє порожню назву", () => {
        expect(eventSchema.safeParse({ ...valid, title: "   " }).success).toBe(false);
    });

    it("відхиляє некоректну дату", () => {
        expect(eventSchema.safeParse({ ...valid, date: "не дата" }).success).toBe(false);
    });

    it("відхиляє невідому важливість", () => {
        expect(eventSchema.safeParse({ ...valid, importance: "LOW" }).success).toBe(false);
    });
});

describe("registerSchema", () => {
    it("приводить email до нижнього регістру", () => {
        const res = registerSchema.parse({ name: "Іван", email: " User@Mail.COM ", password: "123456" });
        expect(res.email).toBe("user@mail.com");
    });

    it("відхиляє короткий пароль", () => {
        expect(registerSchema.safeParse({ name: "Іван", email: "a@b.com", password: "123" }).success).toBe(false);
    });
});