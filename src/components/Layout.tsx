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
} from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { isJmAuthenticated, logoutJmAccess, subscribeJmAccessChanged } from "@/lib/jmAccess";
import { toast } from "sonner";

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

function Item({ to, label, icon: Icon, end }: { to: string; label: string; icon: typeof Home; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [jmAuthenticated, setJmAuthenticated] = useState(() => isJmAuthenticated());

  useEffect(() => subscribeJmAccessChanged(() => setJmAuthenticated(isJmAuthenticated())), []);

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
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar p-4 md:flex">
        <button onClick={() => navigate("/")} className="mb-6 flex items-center gap-3 text-left">
          <Logo size={40} />
          {/* Nome do sistema em uma única linha — remove a redundância visual do "JM" duplicado. */}
          <div className="text-base font-extrabold leading-tight tracking-tight text-sidebar-primary-foreground">
            Modelo de Nota JM
          </div>
        </button>

        <nav className="flex flex-col gap-1">
          {nav.map((n) => (
            <Item key={n.to} {...n} />
          ))}
        </nav>

        {jmAuthenticated && (
          <>
            {/* Cadastros ficam visíveis apenas após liberar o acesso JM; as rotas seguem protegidas no App. */}
            <div className="mt-6 mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Cadastros
            </div>
            <nav className="flex flex-col gap-1">
              {cadastros.map((n) => (
                <Item key={n.to} {...n} />
              ))}
            </nav>
          </>
        )}

        <div className="mt-auto space-y-3 px-3 pt-6">
          {jmAuthenticated ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto w-full justify-start px-0 text-xs text-sidebar-foreground/60 hover:bg-transparent hover:text-sidebar-foreground"
              onClick={handleLogoutJm}
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair do acesso JM
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto w-full justify-start px-0 text-xs text-sidebar-foreground/60 hover:bg-transparent hover:text-sidebar-foreground"
              onClick={handleOpenJmAccess}
            >
              <LockKeyhole className="h-3.5 w-3.5" />
              Acesso JM
            </Button>
          )}
          <div className="text-xs text-sidebar-foreground/50">
            Documento orientativo. Sem validade fiscal.
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <header className="flex items-center gap-3 border-b bg-card px-4 py-3 md:hidden">
          <Logo size={32} />
          <span className="font-bold text-foreground">Modelo de Nota JM</span>
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
