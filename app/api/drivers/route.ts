// app/api/drivers/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Server validation (source of truth)
const schema = z.object({
  name: z.string().min(2, "Enter full name"),
  // Licence can be blank or >= 3 chars; accept 'licenceNumber' alias from clients
  licenseNumber: z
    .string()
    .optional()
    .transform((v) => (typeof v === "string" ? v.trim().toUpperCase() : ""))
    .refine(
      (s) => s.length === 0 || s.length >= 3,
      "Licence number must be at least 3 characters (or leave it blank)"
    ),
  phone: z.string().min(1, "Phone is required"),
  joinDate: z.string().min(1, "Join date is required"), // yyyy-mm-dd
  profileImageUrl: z
    .string()
    .url("Enter a valid URL")
    .optional()
    .or(z.literal(""))
    .optional(),
});

// Normalize phones like: "+91 90000-00001" → "9000000001"
function normalizePhone(raw: string) {
  return (raw || "").replace(/\D/g, "");
}

export async function GET() {
  const drivers = await prisma.driver.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(drivers);
}

export async function POST(req: Request) {
  try {
    const raw = await req.json();

    // Accept both spellings
    const body = {
      ...raw,
      licenseNumber: raw?.licenseNumber ?? raw?.licenceNumber ?? "",
    };

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const data = parsed.data;

    const phoneDigits = normalizePhone(data.phone);
    if (phoneDigits.length < 10) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: { fieldErrors: { phone: ["Enter a valid phone (10+ digits)"] } },
        },
        { status: 422 }
      );
    }

    const joinDate = new Date(data.joinDate);
    if (Number.isNaN(joinDate.getTime())) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: { fieldErrors: { joinDate: ["Select a valid date"] } },
        },
        { status: 422 }
      );
    }

    // empty string -> null in DB
    const licence = data.licenseNumber && data.licenseNumber.length > 0 ? data.licenseNumber : null;
    const imageUrl = data.profileImageUrl && data.profileImageUrl.length > 0 ? data.profileImageUrl : null;

    const created = await prisma.driver.create({
      data: {
        name: data.name.trim(),
        licenseNumber: licence,
        phone: phoneDigits,
        joinDate,
        profileImageUrl: imageUrl, // Avatar fallback on null
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    // If Prisma complains about unknown args in data, tell the dev to run a migration
    const msg = String(e?.message ?? "");
    if (/Unknown\s+argument\s+.+\s+in\s+data/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            "Your Prisma model Driver is missing one or more fields used by the API. Add licenseNumber, phone, joinDate, profileImageUrl to schema.prisma and run `npx prisma migrate dev`.",
          details: msg,
          needsMigration: true,
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: msg || "Failed to create driver" }, { status: 400 });
  }
}
