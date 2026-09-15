import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachHourOfInterval,
} from "date-fns";
import { toZonedTime, fromZonedTime, formatInTimeZone } from "date-fns-tz";

export const APP_TIMEZONE = "Asia/Colombo";

export type Period = "today" | "week" | "month" | "year";

/** Convert an instant (UTC Date) into the "wall clock" Date object seen in APP_TIMEZONE. */
export function toBusinessTime(date: Date = new Date()): Date {
  return toZonedTime(date, APP_TIMEZONE);
}

/** Convert a "wall clock" Date (as if it were in APP_TIMEZONE) back into a real UTC instant. */
export function fromBusinessTime(wallClock: Date): Date {
  return fromZonedTime(wallClock, APP_TIMEZONE);
}

function zonedToInstant(wallClock: Date): Date {
  return fromZonedTime(wallClock, APP_TIMEZONE);
}

export interface PeriodRange {
  start: Date; // UTC instant, inclusive
  end: Date; // UTC instant, exclusive
  label: string;
}

/** Returns the [start, end) instant range for a period, evaluated in Asia/Colombo wall-clock time. */
export function getPeriodRange(period: Period, reference: Date = new Date()): PeriodRange {
  const zoned = toZonedTime(reference, APP_TIMEZONE);

  switch (period) {
    case "today": {
      const start = startOfDay(zoned);
      const end = endOfDay(zoned);
      return {
        start: zonedToInstant(start),
        end: zonedToInstant(end),
        label: formatInTimeZone(reference, APP_TIMEZONE, "d MMM yyyy"),
      };
    }
    case "week": {
      const start = startOfWeek(zoned, { weekStartsOn: 1 });
      const end = endOfWeek(zoned, { weekStartsOn: 1 });
      return {
        start: zonedToInstant(start),
        end: zonedToInstant(end),
        label: `${formatInTimeZone(zonedToInstant(start), APP_TIMEZONE, "d MMM")} - ${formatInTimeZone(
          zonedToInstant(end),
          APP_TIMEZONE,
          "d MMM yyyy"
        )}`,
      };
    }
    case "month": {
      const start = startOfMonth(zoned);
      const end = endOfMonth(zoned);
      return {
        start: zonedToInstant(start),
        end: zonedToInstant(end),
        label: formatInTimeZone(reference, APP_TIMEZONE, "MMMM yyyy"),
      };
    }
    case "year": {
      const start = startOfYear(zoned);
      const end = endOfYear(zoned);
      return {
        start: zonedToInstant(start),
        end: zonedToInstant(end),
        label: formatInTimeZone(reference, APP_TIMEZONE, "yyyy"),
      };
    }
  }
}

/** The equivalent previous period, same length, immediately before `range`. */
export function getPreviousPeriodRange(period: Period, reference: Date = new Date()): PeriodRange {
  switch (period) {
    case "today":
      return getPeriodRange("today", subDays(reference, 1));
    case "week":
      return getPeriodRange("week", subWeeks(reference, 1));
    case "month":
      return getPeriodRange("month", subMonths(reference, 1));
    case "year":
      return getPeriodRange("year", subYears(reference, 1));
  }
}

export function getDayRange(reference: Date): PeriodRange {
  return getPeriodRange("today", reference);
}

/** Day buckets (Asia/Colombo) covering a range, inclusive. */
export function listDaysInRange(start: Date, end: Date): Date[] {
  const zonedStart = toZonedTime(start, APP_TIMEZONE);
  const zonedEnd = toZonedTime(end, APP_TIMEZONE);
  return eachDayOfInterval({ start: zonedStart, end: zonedEnd }).map((d) => zonedToInstant(startOfDay(d)));
}

export function listMonthsInRange(start: Date, end: Date): Date[] {
  const zonedStart = toZonedTime(start, APP_TIMEZONE);
  const zonedEnd = toZonedTime(end, APP_TIMEZONE);
  return eachMonthOfInterval({ start: zonedStart, end: zonedEnd }).map((d) => zonedToInstant(startOfMonth(d)));
}

export function listHoursInRange(start: Date, end: Date): Date[] {
  const zonedStart = toZonedTime(start, APP_TIMEZONE);
  const zonedEnd = toZonedTime(end, APP_TIMEZONE);
  return eachHourOfInterval({ start: zonedStart, end: zonedEnd }).map((d) => zonedToInstant(d));
}

export function formatBusiness(date: Date, fmt: string): string {
  return formatInTimeZone(date, APP_TIMEZONE, fmt);
}

/** "yyyy-MM-dd" key for the current business day in Asia/Colombo — used to key one-per-day records. */
export function getBusinessDateKey(reference: Date = new Date()): string {
  return formatBusiness(reference, "yyyy-MM-dd");
}

/** Inverse of getBusinessDateKey: the [start, end] instant range for a "yyyy-MM-dd" business day. */
export function businessDateKeyToRange(businessDate: string): PeriodRange {
  const [y, m, d] = businessDate.split("-").map(Number);
  const wallClockNoon = new Date(y, m - 1, d, 12, 0, 0);
  return getPeriodRange("today", fromBusinessTime(wallClockNoon));
}

export function nowInBusinessTime(): Date {
  return toZonedTime(new Date(), APP_TIMEZONE);
}

/** True if `reference`'s calendar date, read in Asia/Colombo, is the last day of its month. */
export function isLastDayOfMonthBusiness(reference: Date = new Date()): boolean {
  const zoned = toZonedTime(reference, APP_TIMEZONE);
  const tomorrow = new Date(zoned);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.getMonth() !== zoned.getMonth();
}
