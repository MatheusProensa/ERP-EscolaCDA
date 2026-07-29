"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type Variant = "success" | "error" | "info";

const VARIANT: Record<Variant, { Icon: typeof CheckCircle2; color: string }> = {
  success: { Icon: CheckCircle2, color: "#16A34A" },
  error: { Icon: XCircle, color: "#DC2626" },
  info: { Icon: Info, color: "#1A6FD8" },
};

type ToastItem = { id: number; message: string; variant: Variant };

let pushToast: ((message: string, variant?: Variant) => void) | null = null;

/** Chame de qualquer client component, sem precisar de context/prop drilling. */
export function showToast(message: string, variant: Variant = "success") {
  pushToast?.(message, variant);
}

/**
 * Monte UMA VEZ no layout raiz (dentro do AppShell). Resolve o diagnóstico de UX:
 * ações como "Registrar pagamento" hoje só dão router.refresh() silencioso, sem
 * nenhuma confirmação visual pro usuário.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    pushToast = (message, variant = "success") => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, message, variant }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
    };
    return () => {
      pushToast = null;
    };
  }, []);

  return (
    <>
      {children}
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => {
          const { Icon, color } = VARIANT[t.variant];
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex items-center gap-2.5 rounded-lg bg-cda-navy px-4 py-3 text-sm font-medium text-white shadow-xl"
            >
              <Icon className="h-[18px] w-[18px]" style={{ color }} />
              {t.message}
              <button onClick={() => setToasts((ts) => ts.filter((x) => x.id !== t.id))} aria-label="Fechar notificação" className="ml-1 text-white/60 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
