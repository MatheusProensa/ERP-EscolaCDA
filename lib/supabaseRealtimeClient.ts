"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cliente: SupabaseClient | null | undefined;

/** Cliente do navegador só pra escutar os avisos do Realtime (canal público,
 * sem dado sensível trafegando nele) — usa a chave anônima, feita pra ficar
 * exposta no bundle do client. `undefined` = ainda não tentou criar,
 * `null` = tentou e não tem as variáveis configuradas (funciona sem, cai
 * pro polling de sempre). */
export function getSupabaseRealtimeClient(): SupabaseClient | null {
  if (cliente !== undefined) return cliente;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chaveAnonima = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  cliente = url && chaveAnonima ? createClient(url, chaveAnonima) : null;
  return cliente;
}
