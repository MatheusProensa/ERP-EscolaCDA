/** Dias úteis cobertos pelo planejamento semanal — segunda a sexta (achado
 * confirmado, out/2026: planejamento é SEMANAL, não mensal). Offset em dias
 * a partir da segunda-feira daquela semana. */
export const OFFSETS_DIA_UTIL = [0, 1, 2, 3, 4] as const;

/** Segunda-feira (meia-noite UTC) da semana que contém `data` — identidade
 * do Planejamento é (turma, semanaInicio), sempre normalizada pra segunda,
 * independente de qual dia da semana alguém abriu a tela. Mesma convenção de
 * data pura (meia-noite UTC) usada em EventoCalendario/AnoLetivo. */
export function segundaFeiraDe(data: Date): Date {
  const diaSemana = data.getUTCDay(); // 0=Dom, 1=Seg, ..., 6=Sáb
  const deslocamento = diaSemana === 0 ? -6 : 1 - diaSemana;
  const segunda = new Date(data);
  segunda.setUTCDate(segunda.getUTCDate() + deslocamento);
  return segunda;
}

/** As 5 datas (segunda a sexta) da semana que começa em `segunda`. */
export function diasDaSemana(segunda: Date): Date[] {
  return OFFSETS_DIA_UTIL.map((offset) => {
    const d = new Date(segunda);
    d.setUTCDate(d.getUTCDate() + offset);
    return d;
  });
}

/** "YYYY-MM-DD" em UTC — chave estável de dia pra usar em query string e
 * comparar datas sem depender de fuso horário do navegador. */
export function isoData(data: Date): string {
  return data.toISOString().slice(0, 10);
}
