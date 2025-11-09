// app/performance/page.tsx
import { prisma } from "@/lib/prisma";
import PerformanceClient, { type DriverView } from "./performanceClient";

function toISODateOnly(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  return utc.toISOString().slice(0, 10); // yyyy-mm-dd
}

export default async function PerformancePage() {
  // Keep your existing filters exactly as they are (hidden/removed) if you had them.
  const drivers = await prisma.driver.findMany({
    include: {
      weeklyEntries: {
        // ⬇️ FIX: your schema uses weekStart / weekEnd (not weekStartDate)
        orderBy: { weekEnd: "desc" }, // or { weekStart: "desc" } if you prefer
      },
    },
    orderBy: { createdAt: "desc" }, // if Driver has no createdAt, change to { name: "asc" }
  });

  // Map DB shape -> UI shape expected by PerformanceClient (no backend change)
  const uiDrivers: DriverView[] = drivers.map((d) => ({
    id: d.id,
    name: d.name,
    // Keep these flexible in case your schema doesn't have them:
    profileImageUrl: (d as any).profileImageUrl ?? null,
    licenseNumber: (d as any).licenseNumber ?? null,
    rating: (d as any).rating ?? null,
    weeklyEarnings: d.weeklyEntries.map((w: any) => ({
      id: w.id,
      // ⬇️ map your DB fields to the client’s expected props
      weekStartDate: toISODateOnly(w.weekStart),
      weekEndDate: toISODateOnly(w.weekEnd),
      earningsInINR: Number(w.earnings ?? w.earningsInINR ?? 0),
      tripsCompleted: Number(w.trips ?? w.tripsCompleted ?? 0),
    })),
  }));

  return <PerformanceClient drivers={uiDrivers} />;
}
