import { createClient } from "@supabase/supabase-js";
import { canalConversaDireta, canalInbox } from "@/lib/chatCanais";

let clienteServidor: ReturnType<typeof createClient> | null = null;

/** Só existe quando as variáveis do Supabase Realtime estão configuradas — sem
 * elas, o chat continua funcionando normalmente (só sem o aviso instantâneo,
 * cai de volta no polling). Nunca lança erro por falta de configuração. */
function clientePraAvisar() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chaveServico = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chaveServico) return null;
  if (!clienteServidor) {
    clienteServidor = createClient(url, chaveServico, {
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
  return clienteServidor;
}

/** Manda um broadcast leve (sem conteúdo da mensagem, só "algo mudou aqui")
 * pro canal da conversa e pra caixa de entrada de quem recebeu. Quem estiver
 * ouvindo refaz a busca autenticada de sempre — o aviso em si nunca carrega
 * dado sensível, só avisa que vale a pena buscar de novo agora. */
export async function avisarChatDireto(params: { remetenteId: string; destinatarioId: string }): Promise<void> {
  const supabase = clientePraAvisar();
  if (!supabase) return;

  const nomesCanais = [canalConversaDireta(params.remetenteId, params.destinatarioId), canalInbox(params.destinatarioId)];
  await Promise.all(
    nomesCanais.map(async (nome) => {
      try {
        const canal = supabase.channel(nome);
        await canal.send({ type: "broadcast", event: "atualizou", payload: {} });
      } catch {
        // Realtime é só um atalho pra parecer instantâneo — se falhar (rede,
        // Supabase fora do ar), o polling de sempre continua cobrindo.
      }
    })
  );
}
