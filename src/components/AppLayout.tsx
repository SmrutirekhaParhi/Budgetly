import { type ReactNode } from "react";
import BottomNav from "./BottomNav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto relative">
      <main className="flex-1 pb-24 px-4 pt-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
