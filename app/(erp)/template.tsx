/**
 * template.tsx (diferente de layout.tsx) monta uma instância nova a cada navegação,
 * exatamente no momento em que o conteúdo real substitui o loading.tsx — é o gancho
 * certo pra animar essa troca (key={pathname} no AppShell não pegava esse instante,
 * só a navegação em si, então a troca skeleton → conteúdo ficava sem transição).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
