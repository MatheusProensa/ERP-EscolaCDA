import { ShieldCheck, Users, TrendingUp } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";

function Ponto({ className }: { className?: string }) {
  return <span className={`inline-block h-1 w-1 rounded-full bg-white/25 ${className ?? ""}`} />;
}

/** Grade de pontinhos decorativa (canto), textura discreta — não é a estrela do
 * layout, só preenche o canto vazio como no material gráfico da escola. */
function GradePontos({ className }: { className?: string }) {
  const linhas = 4;
  const colunas = 6;
  return (
    <div className={`grid grid-cols-6 gap-2 ${className ?? ""}`} aria-hidden="true">
      {Array.from({ length: linhas * colunas }).map((_, i) => (
        <Ponto key={i} />
      ))}
    </div>
  );
}

const DESTAQUES = [
  { icon: ShieldCheck, label: "Seguro" },
  { icon: Users, label: "Organizado" },
  { icon: TrendingUp, label: "Eficiente" },
];

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-cda-navy lg:items-stretch">
      {/* Painel de marca — só em telas largas; no celular a identidade fica
          reduzida a uma faixa curta acima do formulário (abaixo). Foto real do
          pátio (aérea) com degradê leve — a foto continua viva, não vira uma
          mancha escura atrás do texto. */}
      <div className="relative hidden w-1/2 shrink-0 overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/escola-drone.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-cda-navy/95 via-cda-navy/60 to-cda-navy/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-cda-navy/80 via-transparent to-transparent" />

        <GradePontos className="relative" />

        <div className="relative flex flex-col gap-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-cda-15anos.webp" alt="Escola CDA · 15 anos" className="h-auto w-52 drop-shadow-md" />
          <div>
            <h1 className="text-3xl font-extrabold leading-tight text-white">
              Bem-vindo ao painel <span className="text-cda-yellow">da Escola CDA</span>
            </h1>
            <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-white/70">
              Gestão e acompanhamento em um só lugar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/15 pt-5">
            {DESTAQUES.map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-sm font-medium text-white/80">
                <Icon className="h-4 w-4 text-cda-yellow" />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="relative flex flex-col gap-0.5">
          <p className="text-xs text-white/40">© {new Date().getFullYear()} Escola CDA. Todos os direitos reservados.</p>
          <p className="text-xs text-white/30">Desenvolvido por Matheus Proensa</p>
        </div>
      </div>

      {/* Formulário */}
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3 text-center lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-cda-15anos.webp" alt="Escola CDA · 15 anos" className="h-auto w-44" />
          </div>

          <div className="rounded-[14px] bg-cda-surface p-8 shadow-2xl shadow-black/20">
            <div className="mb-7 flex flex-col items-center gap-1 text-center">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-cda-blue/10">
                <ShieldCheck className="h-5 w-5 text-cda-blue" />
              </div>
              <h2 className="text-xl font-bold text-cda-text">Olá! 👋</h2>
              <p className="text-sm text-cda-text2">Acesse sua conta para continuar.</p>
            </div>
            <LoginForm />
          </div>

          <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-cda-text3">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            Seus dados estão protegidos — ambiente seguro e confiável.
          </p>
          <p className="mt-2 text-center text-xs text-cda-text3/70">Desenvolvido por Matheus Proensa</p>
        </div>
      </div>
    </div>
  );
}
