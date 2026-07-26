"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({
  role,
  name,
  children,
}: {
  role: string;
  name: string;
  children: React.ReactNode;
}) {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="flex h-screen">
      <Sidebar role={role} open={menuAberto} onClose={() => setMenuAberto(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar name={name} role={role} onMenuClick={() => setMenuAberto(true)} />
        <main className="flex-1 overflow-y-auto bg-cda-bg p-4 sm:p-5">{children}</main>
      </div>
    </div>
  );
}
