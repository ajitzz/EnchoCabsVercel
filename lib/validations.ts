import { z } from "zod";

export const driverSchema = z.object({
  name: z.string().min(1, "Driver name is required"),
  phone: z
    .string()
    .trim()
    .min(10, "Phone must be at least 10 digits")
    .max(20, "Phone too long")
    .regex(/^[0-9+\-\s()]+$/, "Invalid phone")
    .optional(),
  licenseNo: z.string().trim().optional(),
  vehicleNo: z.string().trim().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional(),
  profileImageUrl: z.string().url().optional(),
  hidden: z.boolean().optional(),
});
export type DriverInput = z.infer<typeof driverSchema>;

export const weeklyEntrySchema = z.object({
  driverId: z.string().min(1, "Driver is required"),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  earnings: z.preprocess(
    (v) => (typeof v === "string" ? Number(v) : v),
    z.number({ invalid_type_error: "Enter a valid amount" }).finite("Enter a valid amount")
  ),
  trips: z.preprocess(
    (v) => (typeof v === "string" ? Number(v) : v),
    z.number({ invalid_type_error: "Enter a whole number" }).int("Enter a whole number").min(0)
  ),
  notes: z.string().optional(),
});
export type WeeklyEntryInput = z.infer<typeof weeklyEntrySchema>;
