"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  DIRECAO: "Direção",
  SECRETARIA: "Secretaria",
};

export function UserMenu({ name, role }: { name: string; role: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-cda-bg"
      >
        <Avatar nome={name} />
        <div className="hidden text-left sm:block">
          <div className="text-sm font-semibold text-cda-text leading-tight">{name}</div>
          <div className="text-xs text-cda-text3 leading-tight">
            {ROLE_LABEL[role] ?? role}
          </div>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-lg border border-cda-border bg-white py-1 shadow-lg">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-cda-red hover:bg-cda-bg"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
