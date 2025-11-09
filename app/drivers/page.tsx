// app/drivers/page.tsx
import { prisma } from "@/lib/prisma";
import DriversClient, { type DriverListItem } from "./_components/DriverClient";

function toISODateOnly(d?: Date | null) {
  if (!d) return null;
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  return utc.toISOString().slice(0, 10);
}

export default async function DriversPage() {
  const rows = await prisma.driver.findMany({
    orderBy: { createdAt: "desc" },
  });

  const initialDrivers: DriverListItem[] = rows.map((d) => ({
    id: d.id,
    name: d.name,
    licenseNumber: d.licenseNumber ?? "",
    phone: d.phone ?? "",
    joinDate: toISODateOnly(d.joinDate),
    profileImageUrl: d.profileImageUrl ?? "",
    hidden: !!d.hidden,
    createdAt: d.createdAt.toISOString(),
  }));

  return <DriversClient initialDrivers={initialDrivers} />;
}
