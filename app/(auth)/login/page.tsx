import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cda-navy px-4">
      <div className="w-full max-w-sm rounded-[10px] bg-cda-surface p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-cda-navy">CDA</span>
            <span className="rounded-full bg-cda-yellow px-2 py-0.5 text-[10px] font-bold text-cda-navy">
              ERP
            </span>
          </div>
          <h1 className="text-lg font-bold text-cda-text">Acesse sua conta</h1>
          <p className="mt-1 text-sm text-cda-text2">Painel de gestão da Escola CDA</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
