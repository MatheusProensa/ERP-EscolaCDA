import { ClipboardList } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

/** Um dos cinco banners de atenção do sistema — unificado no <Alert> (handoff
 * de design, etapa 4.3): mesmo formato de CensoAlerta, aniversariantes,
 * documentos, usuários e boletos/notas fiscais. */
export function CensoAlerta({ quantidade }: { quantidade: number }) {
  if (quantidade === 0) return null;
  return (
    <Alert
      tone="critical"
      icon={ClipboardList}
      title="Alerta importante"
      action={
        <Button href="/alunos?censo=incompleto" variant="secondary" className="w-full shrink-0 sm:w-auto">
          Resolver pendências
        </Button>
      }
    >
      {quantidade} aluno(s) com dados incompletos para o censo escolar (sexo, raça/cor ou nome da mãe).
    </Alert>
  );
}
