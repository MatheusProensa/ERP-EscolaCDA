"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type Ponto = { data: string; valor: number };

/** Um gráfico de linha só (peso OU altura) — nunca os dois juntos: escalas
 * diferentes (kg vs cm) num eixo dual-axis só confunde qual linha é qual
 * (ver dataviz: "nunca dual-axis, 2 medidas de escala diferente viram 2
 * gráficos"). Série única não precisa de legenda — o título ao lado já diz
 * o que é. */
export function GraficoCrescimento({ titulo, unidade, pontos, cor }: { titulo: string; unidade: string; pontos: Ponto[]; cor: string }) {
  if (pontos.length < 2) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-1 text-center text-sm text-cda-text3">
        <span className="font-medium text-cda-text2">{titulo}</span>
        <span>Precisa de pelo menos 2 avaliações pra desenhar o gráfico.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-cda-text2">
        {titulo} <span className="text-cda-text3">({unidade})</span>
      </span>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={pontos} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="var(--cda-border)" vertical={false} />
          <XAxis
            dataKey="data"
            tick={{ fontSize: 11, fill: "var(--cda-text3)" }}
            axisLine={{ stroke: "var(--cda-border)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--cda-text3)" }}
            axisLine={false}
            tickLine={false}
            width={40}
            domain={["dataMin - 1", "dataMax + 1"]}
          />
          <Tooltip
            formatter={(valor) => [`${valor} ${unidade}`, titulo]}
            contentStyle={{
              borderRadius: 8,
              borderColor: "var(--cda-border)",
              fontSize: 12,
              boxShadow: "0 4px 16px -4px rgb(13 31 78 / 0.15)",
            }}
          />
          <Line
            type="monotone"
            dataKey="valor"
            stroke={cor}
            strokeWidth={2}
            dot={{ r: 4, fill: cor, strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
