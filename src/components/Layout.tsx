import { NavLink, useNavigate } from "react-router-dom";
import { ReactNode, useEffect, useState } from "react";
import {
  Home,
  Upload,
  Search,
  Building2,
  Warehouse,
  Package,
  FileText,
  ScrollText,
  LogOut,
  LockKeyhole,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { isJmAuthenticated, logoutJmAccess, subscribeJmAccessChanged } from "@/lib/jmAccess";
import { toast } from "sonner";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "modeloNotaSidebarCollapsed";

const nav = [
  { to: "/", label: "Início", icon: Home, end: true },
  { to: "/importar", label: "Importar GRL019", icon: Upload },
  // Renomeado: a tela localiza um contrato e gera o modelo de nota (não é só pesquisa).
  { to: "/pesquisa", label: "Gerar Modelo de Nota", icon: Search },
];

const cadastros = [
  { to: "/cadastros/cooperativas", label: "Cooperativas", icon: Building2 },
  { to: "/cadastros/armazens", label: "Armazéns / Destinatários", icon: Warehouse },
  { to: "/cadastros/produtos", label: "Produtos", icon: Package },
  { to: "/cadastros/tipos-contrato", label: "Tipos de Contrato", icon: ScrollText },
  { to: "/cadastros/modelos-nota", label: "Modelos de Nota", icon: FileText },
];

function Item({
  to,
  label,
  icon: Icon,
  end,
  collapsed,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  end?: boolean;
  collapsed: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          "flex items-center rounded-lg text-sm font-medium transition-colors",
          collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2",
          // White opacity keeps inactive menu items legible against the dark-blue sidebar.
          isActive
            ? "bg-white/[0.12] text-white shadow-sm ring-1 ring-white/10"
            : "text-white/75 hover:bg-white/10 hover:text-white",
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [jmAuthenticated, setJmAuthenticated] = useState(() => isJmAuthenticated());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true";
  });

  useEffect(() => subscribeJmAccessChanged(() => setJmAuthenticated(isJmAuthenticated())), []);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Caminho visual discreto para a equipe JM abrir o guard sem expor o menu de cadastros ao público.
  const handleOpenJmAccess = () => navigate("/cadastros/cooperativas");

  // Opção discreta para encerrar a sessão JM salva no sessionStorage.
  const handleLogoutJm = () => {
    logoutJmAccess();
    setJmAuthenticated(false);
    toast.success("Acesso JM encerrado.");
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "relative hidden shrink-0 flex-col bg-sidebar p-4 transition-[width] duration-200 md:flex",
          sidebarCollapsed ? "w-20" : "w-64",
        )}
      >
        <div className={cn("mb-6 flex", sidebarCollapsed ? "flex-col items-center gap-3" : "items-start gap-3")}>
          <button
            onClick={() => navigate("/")}
            className={cn("flex min-w-0 items-center text-left", sidebarCollapsed ? "justify-center" : "gap-3")}
            aria-label="Ir para o início"
          >
            <Logo size={sidebarCollapsed ? 36 : 42} />
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <div className="truncate text-base font-semibold leading-tight tracking-tight text-white">Modelo de Nota</div>
                <div className="truncate text-xs text-white/70">JM Assessoria</div>
              </div>
            )}
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 shrink-0 text-white/70 hover:bg-white/10 hover:text-white",
              !sidebarCollapsed && "ml-auto",
            )}
            onClick={() => setSidebarCollapsed((current) => !current)}
            aria-label={sidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            title={sidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="flex flex-col gap-1">
          {nav.map((n) => (
            <Item key={n.to} {...n} collapsed={sidebarCollapsed} />
          ))}
        </nav>

        {jmAuthenticated && (
          <>
            {/* Cadastros ficam visíveis apenas após liberar o acesso JM; as rotas seguem protegidas no App. */}
            {!sidebarCollapsed && (
              <div className="mb-2 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-white/55">
                Cadastros
              </div>
            )}
            <nav className={cn("flex flex-col gap-1", sidebarCollapsed ? "mt-6" : undefined)}>
              {cadastros.map((n) => (
                <Item key={n.to} {...n} collapsed={sidebarCollapsed} />
              ))}
            </nav>
          </>
        )}

        <div className={cn("mt-auto space-y-3 pt-6", sidebarCollapsed ? "px-0" : "px-3")}>
          {jmAuthenticated ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title={sidebarCollapsed ? "Sair do acesso JM" : undefined}
              className={cn(
                "h-auto w-full text-xs text-white/65 hover:bg-white/10 hover:text-white",
                sidebarCollapsed ? "justify-center px-0" : "justify-start px-0",
              )}
              onClick={handleLogoutJm}
            >
              <LogOut className="h-3.5 w-3.5" />
              {!sidebarCollapsed && "Sair do acesso JM"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title={sidebarCollapsed ? "Acesso JM" : undefined}
              className={cn(
                "h-auto w-full text-xs text-white/65 hover:bg-white/10 hover:text-white",
                sidebarCollapsed ? "justify-center px-0" : "justify-start px-0",
              )}
              onClick={handleOpenJmAccess}
            >
              <LockKeyhole className="h-3.5 w-3.5" />
              {!sidebarCollapsed && "Acesso JM"}
            </Button>
          )}
          {!sidebarCollapsed && <div className="text-xs text-white/55">Documento orientativo. Sem validade fiscal.</div>}
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <header className="flex items-center gap-3 border-b bg-card px-4 py-3 md:hidden">
          <Logo size={32} />
          <div className="min-w-0">
            <span className="block truncate font-semibold text-foreground">Modelo de Nota</span>
            <span className="block truncate text-xs text-muted-foreground">JM Assessoria</span>
          </div>
          {jmAuthenticated ? (
            <Button type="button" variant="ghost" size="sm" className="ml-auto text-xs" onClick={handleLogoutJm}>
              Sair JM
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="sm" className="ml-auto text-xs" onClick={handleOpenJmAccess}>
              Acesso JM
            </Button>
          )}
        </header>
        <div className="mx-auto max-w-6xl animate-fade-in p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
