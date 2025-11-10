// app/layout.tsx
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import "./globals.css";
import { ReactNode } from "react";
import Link from "next/link";
import {Button} from "@/components/ui/button";

export const metadata = {
  title: "ENCHO • Drivers Performance & Weekly Entry",
  description: "Taxi Rental • Driver Performance",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-200 text-slate-900">
        <header className="sticky top-0 z-50 backdrop-blur bg-white/80 border-b">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 font-extrabold">
              <div className="w-9 h-9 rounded-lg grid place-items-center shadow"
                   style={{background:"conic-gradient(from 200deg at 50% 50%, #22c55e 0 20%, #34d399 20% 40%, #0ea5e9 40% 60%, #8b5cf6 60% 80%, #22d3ee 80% 100%)"}}>🚕</div>
              <span>ENCHO</span>
            </div>
            <nav className="text-sm font-semibold text-slate-600">
              <a className="hover:text-slate-900" href="/performance">Performance</a>
                    <Button > <Link href="/drivers">Register</Link></Button>
                    <Button > <Link href="/performance">performance</Link></Button>
                    <Button > <Link href="/weekly/add">Entry</Link></Button>
                    <Button > <Link href="/weekly/manage">Manage</Link></Button>
             </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
