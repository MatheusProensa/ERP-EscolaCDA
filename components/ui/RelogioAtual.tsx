"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

/** Data por extenso + hora com segundos, atualizando a cada segundo — pro
 * "Bem-vindo(a) de volta" do Dashboard (pedido do dono: dá pra saber, de
 * relance, se o sistema tá "vivo" e qual o horário certo agora).
 *
 * Sempre no fuso de Brasília, não no do navegador — a escola só opera daqui,
 * então mostrar o fuso de quem acessa de outro lugar (raro, mas acontece)
 * ia só confundir. `useState(null)` + render só depois do mount evita
 * hydration mismatch: o servidor renderiza num instante, o navegador aterrissa
 * num instante ligeiramente diferente, e o React acusa erro se os dois textos
 * não baterem exatamente.
 */
export function RelogioAtual() {
  const [agora, setAgora] = useState<Date | null>(null);

  useEffect(() => {
    setAgora(new Date());
    const intervalo = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(intervalo);
  }, []);

  if (!agora) return null;

  const data = agora.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const hora = agora.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <p className="mt-1 flex items-center gap-1.5 text-sm text-cda-text2">
      <Clock className="h-3.5 w-3.5 shrink-0 text-cda-text3" />
      <span className="capitalize">{data}</span>
      <span className="text-cda-text3">·</span>
      <span className="tabular-nums">{hora}</span>
    </p>
  );
}
