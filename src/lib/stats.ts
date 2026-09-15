import { prisma } from "@/lib/db";
import { addDays, addMonths, addHours } from "date-fns";
import { formatBusiness, listDaysInRange, listHoursInRange, listMonthsInRange } from "@/lib/tz";
import type { PaymentMethod } from "@prisma/client";

export interface Summary {
  liters: number;
  revenue: number;
  transactions: number;
}

export async function getSummary(start: Date, end: Date, employeeId?: string): Promise<Summary> {
  const agg = await prisma.sale.aggregate({
    where: {
      transactionDate: { gte: start, lte: end },
      ...(employeeId ? { employeeId } : {}),
    },
    _sum: { liters: true, amount: true },
    _count: { _all: true },
  });
  return {
    liters: agg._sum.liters ?? 0,
    revenue: agg._sum.amount ?? 0,
    transactions: agg._count._all ?? 0,
  };
}

export async function getPaymentBreakdown(start: Date, end: Date): Promise<Record<PaymentMethod, number>> {
  const rows = await prisma.sale.groupBy({
    by: ["paymentMethod"],
    where: { transactionDate: { gte: start, lte: end } },
    _sum: { amount: true },
  });
  const result: Record<string, number> = { CASH: 0, CARD: 0, BANK_TRANSFER: 0, OTHER: 0 };
  for (const row of rows) {
    result[row.paymentMethod] = row._sum.amount ?? 0;
  }
  return result as Record<PaymentMethod, number>;
}

export interface EmployeeBreakdownRow {
  employeeId: string;
  name: string;
  employeeCode: string | null;
  liters: number;
  revenue: number;
  transactions: number;
}

export async function getEmployeeBreakdown(start: Date, end: Date): Promise<EmployeeBreakdownRow[]> {
  const rows = await prisma.sale.groupBy({
    by: ["employeeId"],
    where: { transactionDate: { gte: start, lte: end } },
    _sum: { liters: true, amount: true },
    _count: { _all: true },
  });

  const employees = await prisma.user.findMany({
    where: { id: { in: rows.map((r) => r.employeeId) } },
    select: { id: true, name: true, employeeCode: true },
  });
  const byId = new Map(employees.map((e) => [e.id, e]));

  return rows
    .map((r) => ({
      employeeId: r.employeeId,
      name: byId.get(r.employeeId)?.name ?? "Unknown",
      employeeCode: byId.get(r.employeeId)?.employeeCode ?? null,
      liters: r._sum.liters ?? 0,
      revenue: r._sum.amount ?? 0,
      transactions: r._count._all,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export interface SeriesPoint {
  bucket: string; // ISO-ish label for the bucket start
  label: string; // human readable label
  liters: number;
  revenue: number;
  transactions: number;
}

export async function getDailySeries(start: Date, end: Date): Promise<SeriesPoint[]> {
  const days = listDaysInRange(start, end);
  const sales = await prisma.sale.findMany({
    where: { transactionDate: { gte: start, lte: end } },
    select: { transactionDate: true, liters: true, amount: true },
  });

  return days.map((dayStart) => {
    const dayEnd = addDays(dayStart, 1);
    const inBucket = sales.filter((s) => s.transactionDate >= dayStart && s.transactionDate < dayEnd);
    return {
      bucket: formatBusiness(dayStart, "yyyy-MM-dd"),
      label: formatBusiness(dayStart, "EEE d MMM"),
      liters: inBucket.reduce((sum, s) => sum + s.liters, 0),
      revenue: inBucket.reduce((sum, s) => sum + s.amount, 0),
      transactions: inBucket.length,
    };
  });
}

export async function getHourlySeries(start: Date, end: Date): Promise<SeriesPoint[]> {
  const hours = listHoursInRange(start, end);
  const sales = await prisma.sale.findMany({
    where: { transactionDate: { gte: start, lte: end } },
    select: { transactionDate: true, liters: true, amount: true },
  });

  return hours.map((hourStart) => {
    const hourEnd = addHours(hourStart, 1);
    const inBucket = sales.filter((s) => s.transactionDate >= hourStart && s.transactionDate < hourEnd);
    return {
      bucket: formatBusiness(hourStart, "yyyy-MM-dd'T'HH"),
      label: formatBusiness(hourStart, "ha"),
      liters: inBucket.reduce((sum, s) => sum + s.liters, 0),
      revenue: inBucket.reduce((sum, s) => sum + s.amount, 0),
      transactions: inBucket.length,
    };
  });
}

export async function getMonthlySeries(start: Date, end: Date): Promise<SeriesPoint[]> {
  const months = listMonthsInRange(start, end);
  const sales = await prisma.sale.findMany({
    where: { transactionDate: { gte: start, lte: end } },
    select: { transactionDate: true, liters: true, amount: true },
  });

  return months.map((monthStart) => {
    const monthEnd = addMonths(monthStart, 1);
    const inBucket = sales.filter((s) => s.transactionDate >= monthStart && s.transactionDate < monthEnd);
    return {
      bucket: formatBusiness(monthStart, "yyyy-MM"),
      label: formatBusiness(monthStart, "MMM"),
      liters: inBucket.reduce((sum, s) => sum + s.liters, 0),
      revenue: inBucket.reduce((sum, s) => sum + s.amount, 0),
      transactions: inBucket.length,
    };
  });
}

export function findExtremeDays(series: SeriesPoint[]): { best: SeriesPoint | null; worst: SeriesPoint | null } {
  const withSales = series.filter((s) => s.transactions > 0);
  if (withSales.length === 0) return { best: null, worst: null };
  const best = withSales.reduce((a, b) => (b.revenue > a.revenue ? b : a));
  const worst = withSales.reduce((a, b) => (b.revenue < a.revenue ? b : a));
  return { best, worst };
}

export function growthPercent(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}
