import { z } from 'zod';


const isoString = (label: string) =>
    z
        .string()
        .refine((v) => !Number.isNaN(Date.parse(v)), `Некоректна дата ${label}`);

export const eventSchema = z
    .object({
        title: z.string().trim().min(1, "Вкажіть назву").max(120, "Назва занадто довга"),
        description: z.string().trim().max(2000, "Опис занадто довгий").optional(),
        date: isoString("початку"),
        endDate: isoString("завершення").optional(),
        importance: z.enum(["NORMAL", "IMPORTANT", "CRITICAL"], { message: "Некоректна важливість" }),
    })
    .superRefine((data, ctx) => {
        if (data.endDate && Date.parse(data.endDate) <= Date.parse(data.date)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Час завершення має бути пізніше початку",
                path: ["endDate"],
            });
        }
    });

export const registerSchema = z.object({
    name: z.string().trim().min(1, "Вкажіть ім'я").max(60, "Ім'я занадто довге"),
    email: z.string().trim().toLowerCase().email("Некоректний email"),
    password: z.string().min(6, "Мінімум 6 символів").max(100),
});