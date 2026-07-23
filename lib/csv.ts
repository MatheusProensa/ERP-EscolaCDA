export function paraCSV(linhas: Record<string, string | number>[], colunas: string[]): string {
  function escapar(valor: string | number): string {
    const texto = String(valor ?? "");
    if (texto.includes(",") || texto.includes('"') || texto.includes("\n")) {
      return `"${texto.replace(/"/g, '""')}"`;
    }
    return texto;
  }

  const cabecalho = colunas.map(escapar).join(",");
  const corpo = linhas.map((linha) => colunas.map((col) => escapar(linha[col])).join(","));
  return ["﻿" + cabecalho, ...corpo].join("\n");
}

export function respostaCSV(conteudo: string, nomeArquivo: string): Response {
  return new Response(conteudo, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
    },
  });
}
