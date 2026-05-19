import { Sidebar } from "@/components/Sidebar";
import { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 h-full overflow-y-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
