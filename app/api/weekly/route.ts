// app/api/weekly/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import {
  createWeeklyEntry,
  listWeeklyEntries,
  deleteWeeklyEntry,
  deleteWeeklyEntries,
} from "@/app/actions";

/** List weekly entries with optional filters */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const driverId = url.searchParams.get("driverId") || undefined;
  const weekStart = url.searchParams.get("weekStart") || undefined;
  const weekEnd = url.searchParams.get("weekEnd") || undefined;

  const rows = await listWeeklyEntries({ driverId, weekStart, weekEnd });
  return NextResponse.json(rows);
}

/** Create / upsert a weekly entry */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const entry = await createWeeklyEntry(body);
    return NextResponse.json(entry, { status: 201 });
  } catch (e: any) {
    if (e?.name === "ZodError" && typeof e.flatten === "function") {
      return NextResponse.json(
        { error: "Validation failed", issues: e.flatten() },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: e?.message ?? "Failed to save weekly entry" },
      { status: 400 }
    );
  }
}

/** Delete one or many weekly entries */
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);

    // 1) Single ID via query: ?id=...
    const singleId = url.searchParams.get("id");
    if (singleId) {
      const res = await deleteWeeklyEntry(singleId);
      return NextResponse.json(res); // { count: 1, id: ... }
    }

    // 2) Many IDs via query: ?ids=1,2,3 OR repeated ?ids=1&ids=2
    const idsCSV = url.searchParams.get("ids");
    let ids = (idsCSV ? idsCSV.split(",").map((s) => s.trim()).filter(Boolean) : [])
      .concat(url.searchParams.getAll("ids"));

    // 3) Many IDs from JSON body: { "ids": [...] }
    if (!ids.length) {
      try {
        const body = await req.json();
        if (Array.isArray(body?.ids)) ids = body.ids;
      } catch {
        // ignore if no body
      }
    }

    if (!ids.length) {
      return NextResponse.json(
        { error: "Provide an id (?id=...) or ids (?ids=a,b,c or JSON {ids:[]})." },
        { status: 400 }
      );
    }

    const res =
      ids.length === 1
        ? await deleteWeeklyEntry(ids[0])
        : await deleteWeeklyEntries(ids);
    return NextResponse.json(res); // { count: N } or { count:1, id:... }
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Delete failed" },
      { status: 400 }
    );
  }
}
