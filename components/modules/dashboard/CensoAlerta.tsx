import { ClipboardList } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

/** Um dos cinco banners de atenção do sistema — unificado no <Alert> (handoff
 * de design, etapa 4.3): mesmo formato de CensoAlerta, aniversariantes,
 * documentos, usuários e boletos/notas fiscais.
 *
 * Achado de auditoria externa (set/2026): título genérico ("Alerta
 * importante") não diz o que aconteceu, e o dado real (a contagem) ficava
 * escondido no corpo — o Alert de Documentos já fazia certo (contagem no
 * título), esse aqui invertia a hierarquia. Corrigido pra seguir o mesmo
 * padrão. */
export function CensoAlerta({ quantidade }: { quantidade: number }) {
  if (quantidade === 0) return null;
  return (
    <Alert
      tone="critical"
      icon={ClipboardList}
      title={`${quantidade} aluno(s) com dados incompletos para o censo`}
      action={
        <Button href="/alunos?censo=incompleto" variant="secondary" className="w-full shrink-0 sm:w-auto">
          Resolver pendências
        </Button>
      }
    >
      Faltam sexo, raça/cor ou nome da mãe no cadastro (aba Censo).
    </Alert>
  );
}
