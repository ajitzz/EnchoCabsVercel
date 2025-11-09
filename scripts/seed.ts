import { prisma } from "@/lib/prisma";

async function main() {
  const d1 = await prisma.driver.upsert({
    where: { phone: "9000000001" },
    update: {},
    create: { name: "Michael Rodriguez", phone: "9000000001", licenseNo: "DL-AAA-0001", hidden: false },
  });
  const d2 = await prisma.driver.upsert({
    where: { phone: "9000000002" },
    update: {},
    create: { name: "Sarah Johnson", phone: "9000000002", licenseNo: "DL-AAA-0002", hidden: false },
  });

  await prisma.weeklyEntry.createMany({
    data: [
      { driverId: d1.id, weekStart: new Date("2025-10-27"), weekEnd: new Date("2025-11-02"), earnings: 1850, trips: 64 },
      { driverId: d2.id, weekStart: new Date("2025-10-27"), weekEnd: new Date("2025-11-02"), earnings: 2100, trips: 66 },
    ],
    skipDuplicates: true,
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
