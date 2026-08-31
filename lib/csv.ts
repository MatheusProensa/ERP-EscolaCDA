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
  // Mesmo tratamento do respostaPDF (lib/gerarRelatorioPdf.ts): manda o nome sem
  // acento como fallback e o de verdade codificado, senão acento no nome do
  // arquivo quebra em navegador mais antigo.
  const semAcento = nomeArquivo.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return new Response(conteudo, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${semAcento}"; filename*=UTF-8''${encodeURIComponent(nomeArquivo)}`,
    },
  });
}
