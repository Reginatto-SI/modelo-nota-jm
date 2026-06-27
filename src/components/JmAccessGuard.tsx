import { FormEvent, ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { isJmAuthenticated, loginJmAccess, subscribeJmAccessChanged } from "@/lib/jmAccess";

// Guarda centralizada para rotas /cadastros, inclusive acesso direto pela URL.
export function JmAccessGuard({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(() => isJmAuthenticated());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => subscribeJmAccessChanged(() => setAuthenticated(isJmAuthenticated())), []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!loginJmAccess(email, password)) {
      toast.error("Login ou senha do acesso JM inválidos.");
      return;
    }

    setAuthenticated(true);
    setPassword("");
    toast.success("Acesso JM liberado para os cadastros.");
  };

  // Volta sempre para uma rota pública conhecida para evitar prender o usuário no modal.
  const handleBack = () => navigate("/pesquisa", { replace: true });

  if (authenticated) return <>{children}</>;

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-md" onInteractOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LockKeyhole className="h-5 w-5 text-primary" />
            Área restrita JM
          </DialogTitle>
          <DialogDescription>
            Os cadastros são de uso exclusivo da equipe JM Assessoria. As telas de importação e geração de modelo de nota continuam públicas.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="jm-access-email">Login</Label>
            <Input
              id="jm-access-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="faturamento@jmassessoriamt.com.br"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jm-access-password">Senha</Label>
            <Input
              id="jm-access-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Digite a senha"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleBack}>
              Voltar
            </Button>
            <Button type="submit" className="w-full sm:w-auto">Entrar nos cadastros</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
