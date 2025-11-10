// app/performance/page.tsx
export const dynamic = "force-dynamic";   // don't pre-render at build
export const runtime = "nodejs";          // ensure Prisma runs on Node

import { unstable_noStore as noStore } from "next/cache";

import PerformanceClient, { type DriverView } from "./performanceClient";
import { getPrisma } from "@/lib/prisma";
const prisma = getPrisma();


/** Safe date -> "YYYY-MM-DD" (UTC normalized) */
function toISODateOnly(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  return utc.toISOString().slice(0, 10);
}

/** Convert Prisma.Decimal/number/string -> number (safe fallback to 0) */
function toNumber(n: unknown): number {
  if (n == null) return 0;
  if (typeof n === "number") return Number.isFinite(n) ? n : 0;
  // Prisma.Decimal can behave like object; string is also common
  const asNum = Number((n as any).toString?.() ?? String(n));
  return Number.isFinite(asNum) ? asNum : 0;
}

/**
 * Build a DriverView[] from:
 *  - drivers with relation include (preferred), or
 *  - fallback weekly table query when the relation name isn't available.
 */
export default async function PerformancePage() {
  noStore(); // belt-and-suspenders: disable caching/SSG

  // Will populate uiDrivers below via either code path
  let uiDrivers: DriverView[] = [];

  // Try the preferred path: include related weekly entries via relation "weeklyEntries"
  try {
    const drivers = await prisma.driver.findMany({
      where: { hidden: false as any, removedAt: null as any }, // tolerate schema variations
      include: {
        // If your relation is named differently, the catch block will handle it
        weeklyEntries: {
          orderBy: { weekEnd: "desc" as const }, // or weekStart, whichever you prefer
        },
      },
      orderBy: { createdAt: "desc" as const }, // fallback to { name: "asc" } if createdAt doesn't exist
    });

    uiDrivers = drivers.map((d: any) => ({
      id: d.id,
      name: d.name,
      // these are optional in some schemas; keep nullable on the client
      profileImageUrl: d.profileImageUrl ?? null,
      licenseNumber: d.licenseNumber ?? null,
      rating: d.rating ?? null,
      weeklyEarnings: (d.weeklyEntries ?? []).map((w: any) => ({
        id: w.id,
        // Support both new/old field names
        weekStartDate: toISODateOnly(w.weekStart ?? w.weekStartDate),
        weekEndDate: toISODateOnly(w.weekEnd ?? w.weekEndDate),
        earningsInINR: toNumber(w.earnings ?? w.earningsInINR),
        tripsCompleted: toNumber(w.trips ?? w.tripsCompleted),
      })),
    }));

    return <PerformanceClient drivers={uiDrivers} />;
  } catch (includeErr) {
    // If the relation name isn't "weeklyEntries" or include fails for another reason,
    // fall back to fetching weekly rows directly from the weekly model then grouping.
    // This also covers older schemas (WeeklyEarning) without changing your DB.
    // console.warn("Include weeklyEntries failed, switching to fallback:", includeErr);
  }

  // Fallback path:
  // 1) fetch drivers (no include)
  const driversOnly = await prisma.driver.findMany({
    where: { hidden: false as any, removedAt: null as any },
    select: {
      id: true,
      name: true,
      // include likely optional profile fields if they exist
      profileImageUrl: true as any,
      licenseNumber: true as any,
      createdAt: true as any,
    },
    orderBy: { createdAt: "desc" as const },
  });

  const driverIds = driversOnly.map((d: any) => d.id);

  // 2) find the correct weekly model and pull all rows for those drivers
  //    Support both "weeklyEntry" (new) and "weeklyEarning" (old) without schema changes.
  //    Using "as any" to avoid runtime crashes if one doesn't exist.
  const Weekly: any =
    (prisma as any).weeklyEntry ??
    (prisma as any).weeklyEarning ??
    null;

  let weeklyRows: any[] = [];
  if (Weekly) {
    try {
      weeklyRows = await Weekly.findMany({
        where: { driverId: { in: driverIds } },
        include: { driver: { select: { id: true, name: true } } },
        orderBy: [{ weekEnd: "desc" as const }], // tolerate old/new fields below during mapping
      });
    } catch {
      // Last-chance: try ordering by weekStart if weekEnd not present in the model
      weeklyRows = await Weekly.findMany({
        where: { driverId: { in: driverIds } },
        include: { driver: { select: { id: true, name: true } } },
        orderBy: [{ weekStart: "desc" as const }],
      });
    }
  }

  // 3) group weekly rows per driverId
  const byDriver = new Map<string, any[]>();
  for (const w of weeklyRows) {
    const k = w.driverId ?? w.driver?.id;
    if (!k) continue;
    if (!byDriver.has(k)) byDriver.set(k, []);
    byDriver.get(k)!.push(w);
  }

  // 4) build the DriverView[]
  uiDrivers = driversOnly.map((d: any) => {
    const rows = byDriver.get(d.id) ?? [];
    return {
      id: d.id,
      name: d.name,
      profileImageUrl: d.profileImageUrl ?? null,
      licenseNumber: d.licenseNumber ?? null,
      rating: d.rating ?? null,
      weeklyEarnings: rows.map((w) => ({
        id: w.id,
        weekStartDate: toISODateOnly(w.weekStart ?? w.weekStartDate),
        weekEndDate: toISODateOnly(w.weekEnd ?? w.weekEndDate),
        earningsInINR: toNumber(w.earnings ?? w.earningsInINR),
        tripsCompleted: toNumber(w.trips ?? w.tripsCompleted),
      })),
    } as DriverView;
  });

  return <PerformanceClient drivers={uiDrivers} />;
}
