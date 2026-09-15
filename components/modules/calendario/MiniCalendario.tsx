import { DIAS_SEMANA_ABREV, gerarGradeMes, mesmaData } from "@/lib/calendario";

/** Mini calendário da sidebar (pedido do dono, mockup de referência) — só
 * reflete o mesmo mês/ano do calendário principal, sem busca própria de
 * dado nem navegação independente (é referência visual, não um 2º
 * controle de mês). */
export function MiniCalendario({ ano, mes, hoje }: { ano: number; mes: number; hoje: Date }) {
  const grade = gerarGradeMes(ano, mes);

  return (
    <div className="grid grid-cols-7 gap-y-1.5 p-3.5">
      {DIAS_SEMANA_ABREV.map((d) => (
        <span key={d} className="text-center text-[10px] font-semibold uppercase text-cda-text3">
          {d[0]}
        </span>
      ))}
      {grade.map(({ data, doMesAtual }, i) => {
        const ehHoje = mesmaData(data, hoje);
        return (
          <div key={i} className="flex items-center justify-center">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                ehHoje ? "bg-cda-blue font-bold text-white" : doMesAtual ? "text-cda-text2" : "text-cda-text3/50"
              }`}
            >
              {data.getUTCDate()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
