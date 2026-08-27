/**
 * Integração com a API de Cobrança de Títulos do Banrisul (registro/consulta/
 * alteração de boleto), pra emitir a mensalidade direto pelo ERP em vez de
 * lançar por fora no portal "Gestão de Cobranças" do banco.
 *
 *   Portal do desenvolvedor: https://developers.banrisul.com.br/bpi/link/api-cobranca-titulos.html
 *   Docs técnicas:           https://developers-openbanking.banrisul.com.br/
 *
 * AINDA NÃO CONECTADO DE VERDADE — falta, nessa ordem:
 *   1. Convênio de Cobrança ativo (Código de Beneficiário) — pede na agência
 *      Banrisul de relacionamento da escola, não tem como pedir por aqui.
 *   2. Cadastro no Portal do Desenvolvedor Banrisul pra gerar as credenciais
 *      da API (client id/secret e/ou certificado, conforme o fluxo de auth
 *      que o portal pedir) — variáveis de ambiente BANRISUL_CODIGO_BENEFICIARIO,
 *      BANRISUL_CLIENT_ID e BANRISUL_CLIENT_SECRET (nunca digitadas em tela
 *      nenhuma do sistema, só lidas do ambiente do servidor).
 *   3. O manual técnico da API (payload exato de registro de título, formato
 *      de autenticação) que só aparece depois de logado no portal.
 *
 * Enquanto os itens acima não existirem, registrarBoleto() sempre devolve erro
 * amigável em vez de tentar bater na API — pra tudo em volta (schema, tela,
 * fluxo) já poder ser usado e testado desde já.
 */

export type DadosBoleto = {
  pagadorNome: string;
  pagadorCpf: string | null;
  competencia: string;
  valor: number;
  /** yyyy-mm-dd */
  vencimento: string;
};

export type ResultadoRegistro =
  | { ok: true; nossoNumero: string; linhaDigitavel: string; codigoBarras: string }
  | { ok: false; erro: string };

export function banrisulConfigurado(): boolean {
  return !!process.env.BANRISUL_CODIGO_BENEFICIARIO && !!process.env.BANRISUL_CLIENT_ID && !!process.env.BANRISUL_CLIENT_SECRET;
}

export async function registrarBoleto(_dados: DadosBoleto): Promise<ResultadoRegistro> {
  if (!banrisulConfigurado()) {
    return {
      ok: false,
      erro:
        "Registro de boleto ainda não configurado — falta o Convênio de Cobrança (Código de Beneficiário) do Banrisul e o cadastro no Portal do Desenvolvedor.",
    };
  }

  // TODO (quando os itens do comentário acima existirem):
  //  1. Autenticar na API (conforme o fluxo do Portal do Desenvolvedor Banrisul).
  //  2. Montar o payload de registro de título com os dados de _dados
  //     (beneficiário = BANRISUL_CODIGO_BENEFICIARIO, pagador, valor, vencimento).
  //  3. Enviar pro endpoint de registro da API de Cobrança de Títulos.
  //  4. Interpretar o retorno (sucesso: nosso número/linha digitável/código de
  //     barras; erro: mensagem do banco) e devolver aqui.
  return { ok: false, erro: "Integração com a API do Banrisul ainda não implementada." };
}
