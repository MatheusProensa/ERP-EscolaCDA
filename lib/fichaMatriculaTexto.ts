// Textos fixos da Ficha de Matrícula — extraídos literalmente do modelo real
// usado pela escola (FICHA_DE_MATRICULA_MATEUS_HISTER_DE_MACEDO.docx), pra
// manter o PDF gerado igual ao documento que a secretaria já usa. Compartilhado
// entre o gerador de PDF (lib/gerarFichaMatriculaPdf) e a pré-visualização no
// modal (FichaMatriculaModal) — o mesmo padrão do contrato (lib/contratoTexto).

export const TEXTO_AUTORIZACAO_IMAGEM =
  "Eu autorizo a utilizar a imagem do aluno (em fotos e vídeos) em materiais de divulgação institucional e " +
  "pedagógica da escola, exclusivamente para fins de promoção de suas atividades, podendo vinculá-las em suas " +
  "redes sociais, website oficial, material impresso e outdoor.";

export const TEXTO_DECLARACAO_MATRICULA =
  "Eu, abaixo assinado, requeiro a matrícula do(a) aluno(a) acima identificado(a), declarando estar de acordo " +
  "com as disposições do Regimento Escolar do estabelecimento. Assumo inteira responsabilidade pelas informações " +
  "citadas nesta ficha de matrícula.";

/** "(X) rótulo" se marcado, "( ) rótulo" se não. */
export function marca(rotulo: string, marcado: boolean | null | undefined): string {
  return `${marcado ? "(X)" : "( )"} ${rotulo}`;
}
