"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = {
  id: number;
  driverName: string;
  driverId: string;
  weekStart: string;
  weekEnd: string;
  earnings: number;
  trips: number;
  notes: string;
  hidden: boolean;
};

export default function DeleteWeeklyTableClient({ initialRows }: { initialRows: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [selected, setSelected] = useState<Record<number, boolean>>({});

  const selectedIds = useMemo(() => Object.entries(selected).filter(([, v]) => v).map(([k]) => Number(k)), [selected]);

  async function onBulkDelete() {
    if (!selectedIds.length) return;
    const res = await fetch("/api/weekly", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j?.error ?? "Failed to delete");
      return;
    }
    setRows((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
    setSelected({});
  }

  async function onToggleHidden(driverId: string, nextHidden: boolean) {
    const res = await fetch(`/api/drivers/${driverId}/toggle`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden: nextHidden }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j?.error ?? "Failed to toggle driver");
      return;
    }
    setRows((prev) =>
      prev
        .map((r) => (r.driverId === driverId ? { ...r, hidden: nextHidden } : r))
        .filter((r) => !r.hidden)
    );
  }

  async function onEdit(row: Row) {
    const patch = {
      weekStart: row.weekStart,
      earnings: row.earnings,
      trips: row.trips,
      notes: row.notes,
    };
    const res = await fetch(`/api/weekly/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j?.error ?? "Failed to update");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button variant="destructive" onClick={onBulkDelete} disabled={!selectedIds.length}>
          Delete Selected
        </Button>
      </div>
      <div className="rounded-xl border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Week Start</TableHead>
              <TableHead>Week End (Sun)</TableHead>
              <TableHead>Earnings (INR)</TableHead>
              <TableHead>Trips</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={!!selected[r.id]}
                    onChange={(e) => setSelected((prev) => ({ ...prev, [r.id]: e.target.checked }))}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap">{r.driverName}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <Input
                    value={r.weekStart}
                    type="date"
                    onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, weekStart: e.target.value } : x)))}
                    onBlur={() => onEdit(r)}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap">{r.weekEnd}</TableCell>
                <TableCell>
                  <Input
                    value={r.earnings}
                    type="number"
                    onChange={(e) =>
                      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, earnings: Number(e.target.value) } : x)))
                    }
                    onBlur={() => onEdit(r)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={r.trips}
                    type="number"
                    onChange={(e) =>
                      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, trips: Number(e.target.value) } : x)))
                    }
                    onBlur={() => onEdit(r)}
                  />
                </TableCell>
                <TableCell className="min-w-[200px]">
                  <Input
                    value={r.notes}
                    onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, notes: e.target.value } : x)))}
                    onBlur={() => onEdit(r)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => onToggleHidden(r.driverId, true)}>
                    Hide Driver
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-slate-500">
                  No rows.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
