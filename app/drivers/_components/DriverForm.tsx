"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { driverSchema, type DriverInput } from "@/lib/validations";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function DriverForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<DriverInput>({
    resolver: zodResolver(driverSchema),
    defaultValues: { hidden: false },
  });

  const onSubmit = async (data: DriverInput) => {
    const form = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined && v !== null) form.append(k, String(v));
    });
    const res = await fetch("/api/drivers", { method: "POST", body: form });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j?.error ?? "Failed");
      return;
    }
    reset({ hidden: false });
    alert("Driver registered!");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...register("name")} placeholder="Driver name" />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...register("phone")} placeholder="+91 9XXXXXXXXX" />
          {errors.phone && <p className="text-xs text-red-600">{errors.phone.message}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="licenseNo">License No (optional)</Label>
          <Input id="licenseNo" {...register("licenseNo")} placeholder="DL-XXXX-0000" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="vehicleNo">Vehicle No (optional)</Label>
          <Input id="vehicleNo" {...register("vehicleNo")} placeholder="KA01AB1234" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="startDate">Start Date (optional)</Label>
          <Input id="startDate" type="date" {...register("startDate")} />
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Register Driver"}
        </Button>
        <Button type="button" variant="outline" onClick={() => reset({ hidden: false })}>
          Reset
        </Button>
      </div>

      <p className="text-xs text-slate-500">Hidden drivers are excluded from Add, Manage, and Performance pages.</p>
    </form>
  );
}
