"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/Card";
import { formatarMoeda } from "@/lib/utils";

export type ResumoMensal = { mes: string; previsto: number; recebido: number };

export function ResumoFinanceiro({ dados }: { dados: ResumoMensal[] }) {
  return (
    <Card title="Previsto vs. recebido" className="p-5">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F2" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#5A6A85" }} axisLine={{ stroke: "#E2E8F2" }} />
            <YAxis
              tick={{ fontSize: 12, fill: "#5A6A85" }}
              axisLine={{ stroke: "#E2E8F2" }}
              tickFormatter={(v) => `R$${v / 1000}k`}
            />
            <Tooltip formatter={(v) => formatarMoeda(Number(v))} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="previsto" name="Previsto" fill="#9AAABE" radius={[4, 4, 0, 0]} />
            <Bar dataKey="recebido" name="Recebido" fill="#1A6FD8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
