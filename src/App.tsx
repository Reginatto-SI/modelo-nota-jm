import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReportProvider } from "@/context/ReportContext";
import Index from "./pages/Index.tsx";
import Importar from "./pages/Importar.tsx";
import Pesquisa from "./pages/Pesquisa.tsx";
import Preview from "./pages/Preview.tsx";
import Cooperativas from "./pages/cadastros/Cooperativas.tsx";
import Armazens from "./pages/cadastros/Armazens.tsx";
import Produtos from "./pages/cadastros/Produtos.tsx";
import TiposContrato from "./pages/cadastros/TiposContrato.tsx";
import ModelosNota from "./pages/cadastros/ModelosNota.tsx";
import NotFound from "./pages/NotFound.tsx";
import { JmAccessGuard } from "./components/JmAccessGuard.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ReportProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/importar" element={<Importar />} />
            <Route path="/pesquisa" element={<Pesquisa />} />
            <Route path="/preview" element={<Preview />} />
            <Route path="/cadastros/cooperativas" element={<JmAccessGuard><Cooperativas /></JmAccessGuard>} />
            <Route path="/cadastros/armazens" element={<JmAccessGuard><Armazens /></JmAccessGuard>} />
            <Route path="/cadastros/produtos" element={<JmAccessGuard><Produtos /></JmAccessGuard>} />
            <Route path="/cadastros/tipos-contrato" element={<JmAccessGuard><TiposContrato /></JmAccessGuard>} />
            <Route path="/cadastros/modelos-nota" element={<JmAccessGuard><ModelosNota /></JmAccessGuard>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ReportProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
