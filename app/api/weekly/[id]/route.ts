import { NextResponse } from "next/server";
import { deleteWeeklyEntry, updateWeeklyEntry } from "@/app/actions";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id)) throw new Error("Bad id");
    const body = await req.json();
    const updated = await updateWeeklyEntry(id, body);
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id)) throw new Error("Bad id");
    const res = await deleteWeeklyEntry(id);
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed" }, { status: 400 });
  }
}
