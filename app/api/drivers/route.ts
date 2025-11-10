// app/api/drivers/route.ts
export const runtime = "nodejs";           // Prisma must run on Node (not Edge)
export const dynamic = "force-dynamic";    // never attempt static pre-render

import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { z } from "zod";

/* -------------------------- Helpers & Validation ------------------------- */

/** Keep only digits from a phone number. */
function onlyDigits(s: string) {
  return (s ?? "").replace(/\D/g, "");
}

/** Parse "YYYY-MM-DD" into a UTC Date at midnight; return null if invalid. */
function parseYMD(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Server-side schema (source of truth). */
const bodySchema = z
  .object({
    name: z.string().trim().min(2, "Enter full name"),

    // Accept blank or >= 3 chars. We'll also accept `licenceNumber` alias.
    licenseNumber: z
      .string()
      .optional()
      .transform((v) => (typeof v === "string" ? v.trim().toUpperCase() : ""))
      .or(z.literal("").transform(() => ""))
      .refine((s) => s.length === 0 || s.length >= 3, {
        message: "Licence number must be at least 3 characters (or leave it blank)",
      }),

    phone: z
      .string()
      .trim()
      .min(1, "Phone is required")
      .transform((v) => onlyDigits(v))
      .refine((digits) => digits.length >= 10, {
        message: "Enter a valid phone (10+ digits)",
      }),

    // strictly "YYYY-MM-DD"
    joinDate: z
      .string()
      .trim()
      .refine((s) => parseYMD(s) !== null, { message: "Select a valid date" }),

    profileImageUrl: z
      .string()
      .trim()
      .url("Enter a valid URL")
      .optional()
      .or(z.literal("").transform(() => "")),
  })
  .transform((data) => ({
    ...data,
    licenseNumber: data.licenseNumber || null,
    profileImageUrl: data.profileImageUrl || null,
    joinDate: parseYMD(data.joinDate)!, // guaranteed by refine
  }));

/* --------------------------------- GET ---------------------------------- */
/** List drivers. Prefer createdAt desc; fall back to name asc if field missing. */
export async function GET() {
  const prisma = getPrisma();
  try {
    try {
      const drivers = await prisma.driver.findMany({
        orderBy: { createdAt: "desc" as const },
      });
      return NextResponse.json(drivers, { headers: { "Cache-Control": "no-store" } });
    } catch {
      // Some schemas may not have createdAt
      const drivers = await prisma.driver.findMany({
        orderBy: { name: "asc" as const },
      });
      return NextResponse.json(drivers, { headers: { "Cache-Control": "no-store" } });
    }
  } catch (e: any) {
    return NextResponse.json(
      { error: String(e?.message ?? "Failed to fetch drivers") },
      { status: 500 }
    );
  }
}

/* --------------------------------- POST --------------------------------- */
/** Create driver; accepts `licenseNumber` or `licenceNumber` from the client. */
export async function POST(req: Request) {
  const prisma = getPrisma();
  try {
    const raw = await req.json();

    // Accept both spellings
    if (raw && raw.licenceNumber != null && raw.licenseNumber == null) {
      raw.licenseNumber = raw.licenceNumber;
    }

    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const data = parsed.data;

    const created = await prisma.driver.create({
      data: {
        name: data.name.trim(),
        licenseNumber: data.licenseNumber,       // null or uppercase license
        phone: data.phone,                       // digits-only
        joinDate: data.joinDate,                 // Date (UTC midnight)
        profileImageUrl: data.profileImageUrl,   // null or URL
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    const msg = String(e?.message ?? "Failed to create driver");

    // Helpful hint if schema is out-of-sync
    if (/Unknown\s+argument\s+.+\s+in\s+data/i.test(msg) || /Argument .+ missing/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            "Your Prisma model `Driver` is missing one or more fields used by this API. " +
            "Ensure the model has: name (String), licenseNumber (String?), phone (String), " +
            "joinDate (DateTime), profileImageUrl (String?). Then run `npx prisma migrate dev`.",
          details: msg,
          needsMigration: true,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
