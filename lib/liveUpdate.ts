import { createClient } from "@supabase/supabase-js";

/** Nome do canal Realtime de um módulo — usado tanto no servidor (pra avisar)
 * quanto no navegador (pra escutar). Um módulo = uma tela/conjunto de telas
 * que compartilham o mesmo dado (ex.: "chaves" cobre a lista de chaves e o
 * histórico de empréstimos). Além do canal do módulo, toda mudança também
 * avisa o canal "dashboard" — os cards de contagem lá dependem de quase
 * todo módulo, então centralizar num canal só evita ter que listar cada
 * módulo na tela do Dashboard toda vez que um novo entrar nesse esquema. */
export function canalModulo(modulo: string): string {
  return `modulo:${modulo}`;
}

let clienteServidor: ReturnType<typeof createClient> | null = null;

/** Só existe quando as variáveis do Supabase Realtime estão configuradas —
 * sem elas, a tela continua funcionando normalmente (só sem o "ao vivo": a
 * pessoa vê o dado atualizado só na próxima ação/F5, como sempre foi). Nunca
 * lança erro por falta de configuração — mesmo padrão do chat (lib/realtime.ts). */
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

/**
 * Avisa quem está com a tela de um módulo aberta que algo mudou lá, pra
 * atualizar sozinho (via router.refresh()) sem precisar de F5. Chamar depois
 * de qualquer create/update/delete bem-sucedido nas rotas de API do módulo.
 *
 * Broadcast vazio — igual ao chat: nunca carrega o dado em si, só avisa "vale
 * a pena buscar de novo". Quem escuta refaz a busca autenticada de sempre, com
 * a permissão de quem está vendo (nunca vaza dado de setor restrito por causa
 * do aviso). Fire-and-forget: se o Realtime falhar (rede, Supabase fora do
 * ar), a rota não quebra — só não teve o efeito "instantâneo" dessa vez.
 */
export async function avisarMudanca(modulo: string): Promise<void> {
  const supabase = clientePraAvisar();
  if (!supabase) return;

  const canais = [canalModulo(modulo), canalModulo("dashboard")];
  await Promise.all(
    canais.map(async (nome) => {
      const canal = supabase.channel(nome);
      try {
        await canal.httpSend("atualizou", {});
      } catch {
        // Realtime é só um atalho pra parecer instantâneo — se falhar, quem
        // estiver com a tela aberta só não atualiza sozinho dessa vez.
      } finally {
        await supabase.removeChannel(canal);
      }
    })
  );
}
