import { LoginForm } from "@/components/auth/LoginForm";

/** Anéis concêntricos suaves, ecoando a auréola do logo — textura de marca no
 * painel navy, não um gradiente decorativo genérico solto. */
function Halos({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" fill="none" className={className} aria-hidden="true">
      <circle cx="200" cy="200" r="180" stroke="#f5c400" strokeOpacity="0.14" strokeWidth="1.5" />
      <circle cx="200" cy="200" r="130" stroke="#f5c400" strokeOpacity="0.18" strokeWidth="1.5" />
      <circle cx="200" cy="200" r="80" stroke="#f5c400" strokeOpacity="0.24" strokeWidth="1.5" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-cda-navy lg:items-stretch">
      {/* Painel de marca — só em telas largas; no celular a identidade fica
          reduzida a uma faixa curta acima do formulário (abaixo). */}
      <div className="relative hidden w-[42%] shrink-0 overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Halos className="pointer-events-none absolute -right-24 -top-24 h-[520px] w-[520px]" />
        <Halos className="pointer-events-none absolute -bottom-32 -left-16 h-[380px] w-[380px] opacity-70" />

        <span className="relative rounded-full bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-white/70">
          Escola CDA
        </span>

        <div className="relative flex flex-col gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-cda.png" alt="Escola CDA" className="h-auto w-64" />
          {/* Arte da campanha 2027 já traz "Escola CDA" no topo dela também — corta
              essa parte (o logo dos 15 anos ali em cima já cobre isso) e mostra só
              o "Fundamental para aprender e crescer", pra não repetir o mesmo
              logo duas vezes empilhado. */}
          <div className="h-[226px] w-64 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/campanha-fundamental.png" alt="Fundamental para aprender e crescer" className="-mt-[57px] w-64" />
          </div>
          <p className="max-w-sm text-[15px] leading-relaxed text-white/70">
            O painel de gestão que organiza matrículas, turmas, ponto e comunicação da escola inteira num só lugar.
          </p>
        </div>

        <p className="relative text-xs text-white/40">Painel de gestão · uso interno</p>
      </div>

      {/* Formulário */}
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3 text-center lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-cda.png" alt="Escola CDA" className="h-auto w-44" />
          </div>

          <div className="rounded-[14px] bg-cda-surface p-8 shadow-2xl shadow-black/20">
            <div className="mb-7 flex flex-col gap-1">
              <h1 className="text-xl font-bold text-cda-text">Acesse sua conta</h1>
              <p className="text-sm text-cda-text2">Painel de gestão da Escola CDA</p>
            </div>
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
