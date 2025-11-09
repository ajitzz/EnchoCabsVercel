// app/performance/_components/PerformanceClient.tsx
"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// ---------- Types exported so page.tsx can import ----------
export type WeeklyRow = {
  id: string;
  weekStartDate: string; // yyyy-mm-dd
  weekEndDate: string;   // yyyy-mm-dd
  earningsInINR: number;
  tripsCompleted: number;
};
export type DriverView = {
  id: string;
  name: string;
  profileImageUrl?: string | null;
  licenseNumber?: string | null;
  rating?: number | null;
  weeklyEarnings: WeeklyRow[];
};

// ---------- Date + number helpers ----------
const formatINR = (n: number) => Math.round(n ?? 0).toLocaleString("en-IN");
const parseISO = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const startOfWeekMon = (d: Date) => {
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff));
};
const endOfWeekSun = (d: Date) => {
  const s = startOfWeekMon(d);
  return new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate() + 6));
};
const toISO = (d: Date) =>
  new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    .toISOString()
    .slice(0, 10);
const formatRange = (startISO: string, endISO: string) => {
  const s = parseISO(startISO);
  const e = parseISO(endISO);
  const fmt: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const yfmt: Intl.DateTimeFormatOptions = { year: "numeric" };
  const sameYear = s.getUTCFullYear() === e.getUTCFullYear();
  return `${s.toLocaleDateString("en-GB", fmt)} – ${e.toLocaleDateString("en-GB", fmt)}${
    sameYear ? "" : ", " + e.toLocaleDateString("en-GB", yfmt)
  }`;
};

// Prefer current week; if none, fallback to most recent week
function pickDisplayWeek(
  rows: WeeklyRow[],
  curStartISO: string,
  curEndISO: string
): { label: "This Week" | "Recent Week"; row: WeeklyRow | null; start: string; end: string } {
  const current =
    rows.find((w) => w.weekStartDate === curStartISO && w.weekEndDate === curEndISO) || null;
  if (current) return { label: "This Week", row: current, start: curStartISO, end: curEndISO };
  const latest = rows.slice().sort((a, b) => (a.weekEndDate < b.weekEndDate ? 1 : -1))[0] || null;
  if (latest)
    return {
      label: "Recent Week",
      row: latest,
      start: latest.weekStartDate,
      end: latest.weekEndDate,
    };
  return { label: "This Week", row: null, start: curStartISO, end: curEndISO };
}

// ---------- UI ----------
const KPI: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Card className="p-5">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="mt-2 text-2xl font-bold">{value}</div>
  </Card>
);

export default function PerformanceClient({ drivers }: { drivers: DriverView[] }) {
  const [selected, setSelected] = useState<DriverView | null>(null);
  const [open, setOpen] = useState(false);

  const now = new Date();
  const curStartISO = toISO(startOfWeekMon(now));
  const curEndISO = toISO(endOfWeekSun(now));

  // KPIs (current-week only to preserve behavior)
  const { totalWeekly, active, avgWeekly, topEarnerName, topEarnerAmount } = useMemo(() => {
    let total = 0;
    let topAmt = 0;
    let topName: string | null = null;

    drivers.forEach((d) => {
      const current = d.weeklyEarnings.find(
        (w) => w.weekStartDate === curStartISO && w.weekEndDate === curEndISO
      );
      const amt = current?.earningsInINR ?? 0;
      total += amt;
      if (amt > topAmt) {
        topAmt = amt;
        topName = d.name;
      }
    });

    const activeCount = drivers.length; // your server may already filter hidden/removed
    const avg = activeCount ? total / activeCount : 0;

    return {
      totalWeekly: total,
      active: activeCount,
      avgWeekly: Math.round(avg),
      topEarnerName: topName ?? "—",
      topEarnerAmount: topAmt,
    };
  }, [drivers, curStartISO, curEndISO]);

  return (
    <div className="container mx-auto max-w-6xl space-y-6 py-6">
      {/* KPIs */}
      <section>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPI label="Total Weekly Earnings" value={`₹${formatINR(totalWeekly)}`} />
          <KPI label="Active Drivers" value={active} />
          <KPI label="Avg Weekly Earnings" value={`₹${formatINR(avgWeekly)}`} />
          <KPI
            label="Top Earner This Week"
            value={
              <div className="flex flex-col">
                <span className="font-extrabold">₹{formatINR(topEarnerAmount)}</span>
                <span className="truncate text-sm text-muted-foreground">{topEarnerName}</span>
              </div>
            }
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Week: {formatRange(curStartISO, curEndISO)}
        </p>
      </section>

      {/* Driver Testimonials */}
      <section>
        <h3 className="mb-3 text-base font-semibold">Drivers Testimonials</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {drivers.map((d) => {
            const masked = (d.licenseNumber || "").replace(/\D/g, "").slice(-3);
            const totalTrips = d.weeklyEarnings.reduce((s, r) => s + (r.tripsCompleted || 0), 0);
            const totalEarn = d.weeklyEarnings.reduce((s, r) => s + (r.earningsInINR || 0), 0);
            const bestWeek = d.weeklyEarnings.reduce((m, r) => Math.max(m, r.earningsInINR || 0), 0);
            const {
              label: weekLabel,
              row: weekRow,
              start: rangeStartISO,
              end: rangeEndISO,
            } = pickDisplayWeek(d.weeklyEarnings, curStartISO, curEndISO);

            return (
              <Card
                key={d.id}
                className="cursor-pointer p-5 transition hover:shadow-lg"
                onClick={() => {
                  setSelected(d);
                  setOpen(true);
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-12 w-12">
                      {d.profileImageUrl ? (
                        <AvatarImage src={d.profileImageUrl} alt={d.name} />
                      ) : (
                        <AvatarFallback>{d.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{d.name}</div>
                      <div className="text-xs text-muted-foreground">DL •••{masked || "—"}</div>
                      <div className="text-xs text-muted-foreground">Trips: {totalTrips}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <Card className="bg-emerald-600 text-white">
                    <CardContent className="p-3 text-center">
                      <div className="text-xs opacity-80">{weekLabel}</div>
                      <div className="text-lg font-bold">₹{formatINR(weekRow?.earningsInINR || 0)}</div>
                      <div className="mt-0.5 text-[10px] opacity-80">
                        {formatRange(rangeStartISO, rangeEndISO)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-3 text-center">
                      <div className="text-xs text-muted-foreground">Total Earnings</div>
                      <div className="text-lg font-bold">₹{formatINR(totalEarn)}</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-amber-50">
                    <CardContent className="p-3 text-center">
                      <div className="text-xs text-amber-700">Best Week</div>
                      <div className="text-lg font-bold text-amber-700">₹{formatINR(bestWeek)}</div>
                    </CardContent>
                  </Card>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          {selected && (
            <>
              <DialogHeader className="mb-2">
                <DialogTitle className="sr-only">Driver Weekly Earnings</DialogTitle>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-14 w-14">
                      {selected.profileImageUrl ? (
                        <AvatarImage src={selected.profileImageUrl} alt={selected.name} />
                      ) : (
                        <AvatarFallback className="text-base">
                          {selected.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <div className="text-xl font-bold">{selected.name}</div>
                      <div className="text-sm text-muted-foreground">
                        <span>⭐ {selected.rating ?? "4.8"}</span>
                        <span className="mx-2">•</span>
                        {selected.weeklyEarnings.reduce((s, r) => s + (r.tripsCompleted || 0), 0)}{" "}
                        trips completed
                      </div>
                    </div>
                  </div>
                  <DialogClose asChild>
                    <Button variant="ghost" size="icon" aria-label="Close">
                      ✕
                    </Button>
                  </DialogClose>
                </div>
              </DialogHeader>

              {(() => {
                const total = selected.weeklyEarnings.reduce(
                  (s, r) => s + (r.earningsInINR || 0),
                  0
                );
                const best = selected.weeklyEarnings.reduce(
                  (m, r) => Math.max(m, r.earningsInINR || 0),
                  0
                );
                const {
                  label: weekLabel,
                  row: weekRow,
                  start: rangeStartISO,
                  end: rangeEndISO,
                } = pickDisplayWeek(selected.weeklyEarnings, curStartISO, curEndISO);

                return (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Card className="bg-emerald-600 text-white">
                      <CardContent className="p-4">
                        <div className="text-xs opacity-90">{weekLabel}</div>
                        <div className="text-2xl font-extrabold">
                          ₹{formatINR(weekRow?.earningsInINR || 0)}
                        </div>
                        <div className="text-xs opacity-80">
                          {formatRange(rangeStartISO, rangeEndISO)}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground">Total Earnings</div>
                        <div className="text-2xl font-extrabold">₹{formatINR(total)}</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground">Best Week</div>
                        <div className="text-2xl font-extrabold text-emerald-700">
                          ₹{formatINR(best)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })()}

              {/* History + Export */}
              <div className="mt-6 flex items-center justify-between">
                <div className="font-semibold">Weekly Earnings History</div>
                <Button
                  onClick={() => {
                    const header = "Week Start,Week End,Earnings (INR),Trips";
                    const rows = selected.weeklyEarnings
                      .map((w) =>
                        [
                          w.weekStartDate,
                          w.weekEndDate,
                          Math.round(w.earningsInINR || 0),
                          w.tripsCompleted || 0,
                        ].join(",")
                      )
                      .join("\n");
                    const csv = [header, rows].join("\n");
                    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${selected.name.trim().replace(/\s+/g, "_")}_weekly.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Export CSV
                </Button>
              </div>

              <div className="mt-3 max-h-[55vh] space-y-3 overflow-y-auto pr-1">
                {selected.weeklyEarnings
                  .slice()
                  .sort((a, b) => (a.weekEndDate < b.weekEndDate ? 1 : -1))
                  .map((w) => {
                    const bestAmt = selected.weeklyEarnings.reduce(
                      (m, r) => Math.max(m, r.earningsInINR || 0),
                      0
                    );
                    const isBest = (w.earningsInINR || 0) === bestAmt;
                    return (
                      <Card key={w.id}>
                        <CardContent className="flex items-center justify-between px-4 py-3">
                          <div>
                            <div className="font-medium">
                              {parseISO(w.weekEndDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {w.tripsCompleted} trips
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {isBest && <Badge variant="secondary">🏆 Best Week</Badge>}
                            <div className="text-lg font-semibold">
                              ₹{formatINR(w.earningsInINR)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
