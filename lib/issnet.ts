/**
 * Integração com o webservice ABRASF 2.04 do ISS.net (Prefeitura de Santa
 * Maria - RS) pra emissão de NFS-e.
 *
 *   Produção:     https://www.issnetonline.com.br/santamaria/
 *   Homologação:  https://www.issnetonline.com.br/homologaabrasf/
 *
 * AINDA NÃO CONECTADO DE VERDADE — falta, nessa ordem:
 *   1. Certificado digital da escola (e-CNPJ, arquivo .pfx) instalado no
 *      servidor — variáveis de ambiente ISSNET_CERTIFICADO_BASE64 e
 *      ISSNET_CERTIFICADO_SENHA (nunca digitadas em tela nenhuma do sistema,
 *      só lidas do ambiente do servidor).
 *   2. Autorização de emissão via webservice liberada pela Prefeitura de
 *      Santa Maria — pedida direto no painel do ISS.net (não é algo que dá
 *      pra automatizar, é um pedido/aprovação do lado da prefeitura).
 *   3. O manual de integração ABRASF específico de Santa Maria, que a
 *      prefeitura manda depois que libera o acesso — o layout exato do XML
 *      (RPS, assinatura, código de serviço/CNAE do município) pode ter
 *      variações por município em cima do padrão ABRASF nacional.
 *
 * Enquanto os itens acima não existirem, emitirNotaFiscal() sempre devolve
 * erro amigável em vez de tentar bater no webservice — pra tudo em volta
 * (schema, tela, fluxo) já poder ser usado e testado desde já.
 */

export type DadosNotaFiscal = {
  tomadorNome: string;
  tomadorCpf: string | null;
  tomadorEmail: string | null;
  competencia: string;
  valorServico: number;
  discriminacao: string;
};

export type ResultadoEmissao =
  | { ok: true; numeroNota: string; serieNota: string; codigoVerificacao: string; protocolo: string }
  | { ok: false; erro: string };

export function issnetConfigurado(): boolean {
  return !!process.env.ISSNET_CERTIFICADO_BASE64 && !!process.env.ISSNET_CERTIFICADO_SENHA;
}

export async function emitirNotaFiscal(_dados: DadosNotaFiscal): Promise<ResultadoEmissao> {
  if (!issnetConfigurado()) {
    return {
      ok: false,
      erro:
        "Emissão de nota fiscal ainda não configurada — falta o certificado digital da escola e a autorização de webservice da Prefeitura de Santa Maria.",
    };
  }

  // TODO (quando os 3 itens do comentário acima existirem):
  //  1. Montar o XML do RPS no padrão ABRASF 2.04 com os dados de _dados.
  //  2. Assinar o XML com o certificado (ISSNET_CERTIFICADO_BASE64 + SENHA).
  //  3. Enviar pro webservice de produção via SOAP.
  //  4. Interpretar o retorno (sucesso: número/série/código de verificação/
  //     protocolo; erro: código + mensagem da prefeitura) e devolver aqui.
  return { ok: false, erro: "Integração com o webservice ainda não implementada." };
}
