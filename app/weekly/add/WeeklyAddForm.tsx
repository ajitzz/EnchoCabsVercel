"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { weeklyEntrySchema, type WeeklyEntryInput } from "@/lib/validations";
import { formatWeekRange } from "@/lib/date";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

type DriverOpt = { id: string; name: string };

export default function WeeklyAddForm({ drivers }: { drivers: DriverOpt[] }) {
  const form = useForm<WeeklyEntryInput>({
    resolver: zodResolver(weeklyEntrySchema),
    defaultValues: {
      weekStart: "",
      earnings: 0,
      trips: 0,
      notes: "",
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset,
  } = form;

  const ws = watch("weekStart");
  const weekPreview = useMemo(() => (ws ? formatWeekRange(ws) : ""), [ws]);

  const onSubmit = async (data: WeeklyEntryInput) => {
    const res = await fetch("/api/weekly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j?.error ?? "Failed");
      return;
    }
    reset();
    alert("Saved!");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="driverId">Driver</Label>
          <select id="driverId" className="mt-2 w-full rounded-md border p-2" {...register("driverId")}>
            <option value="">Select driver…</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          {errors.driverId && <p className="mt-1 text-sm text-red-600">{errors.driverId.message}</p>}
        </div>
        <div>
          <Label htmlFor="weekStart">Week Start (Monday)</Label>
          <Input id="weekStart" type="date" {...register("weekStart")} />
          {errors.weekStart && <p className="mt-1 text-sm text-red-600">{errors.weekStart.message}</p>}
          {weekPreview && <p className="text-xs text-slate-500 mt-1">{weekPreview}</p>}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="earnings">Earnings (INR)</Label>
          <Input id="earnings" type="number" step="1" {...register("earnings")} />
          {errors.earnings && <p className="mt-1 text-sm text-red-600">{errors.earnings.message}</p>}
        </div>
        <div>
          <Label htmlFor="trips">Trips</Label>
          <Input id="trips" type="number" step="1" {...register("trips")} />
          {errors.trips && <p className="mt-1 text-sm text-red-600">{errors.trips.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <textarea id="notes" className="mt-2 w-full rounded-md border p-2" rows={4} {...register("notes")} placeholder="Optional…" />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="outline" onClick={() => reset()}>
          Reset
        </Button>
      </div>
    </form>
  );
}
