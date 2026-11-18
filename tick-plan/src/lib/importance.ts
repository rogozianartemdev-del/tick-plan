import { Importance } from "@prisma/client";


export const IMPORTANCE_VALUES:Importance[] = ["NORMAL", "IMPORTANT", "CRITICAL"];

export const IMPORTANCE: Record<Importance, { label: string; badge: string; color: string }> = {
  NORMAL: {
    label: "Звичайна",
    badge: "bg-slate-100 text-slate-600",
    color: "#64748b", 
  },
  IMPORTANT: {
    label: "Важлива",
    badge: "bg-orange-50 text-orange-700",
    color: "#fb923c",
  },
  CRITICAL: {
    label: "Критична",
    badge: "bg-rose-100/70 text-rose-700",
    color: "#e11d48", 
  },
};