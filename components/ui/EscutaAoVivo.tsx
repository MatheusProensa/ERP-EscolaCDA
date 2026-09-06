"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseRealtimeClient } from "@/lib/supabaseRealtimeClient";
import { canalModulo } from "@/lib/liveUpdate";

/**
 * Deixa uma página "ao vivo": escuta o canal Realtime do módulo e, quando
 * alguém mais salva algo por lá, chama router.refresh() sozinho — sem
 * F5, sem polling. Mesma ideia do badge de mensagens não lidas da Sidebar,
 * só que genérica pra qualquer módulo (ver lib/liveUpdate.ts).
 *
 * Sem efeito visual nenhum (retorna null) — só entra numa página server
 * component qualquer, ex.: `<EscutaAoVivo modulo="chaves" />` logo no topo.
 * Sem as variáveis do Supabase Realtime configuradas, getSupabaseRealtimeClient()
 * devolve null e esse componente vira um no-op — a página continua funcionando
 * normal, só sem o "ao vivo" (dado atualiza na próxima ação/F5, como sempre foi).
 */
export function EscutaAoVivo({ modulo }: { modulo: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseRealtimeClient();
    if (!supabase) return;

    const canal = supabase
      .channel(canalModulo(modulo))
      .on("broadcast", { event: "atualizou" }, () => router.refresh())
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [modulo, router]);

  return null;
}
