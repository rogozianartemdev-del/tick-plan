import { addHours } from "date-fns";

export const DEFAULT_DURATION_HOURS = 1;

export function getEventEnd(event: { date: Date; endDate: Date | null }): Date {
    return event.endDate ?? addHours(event.date, DEFAULT_DURATION_HOURS);
  }