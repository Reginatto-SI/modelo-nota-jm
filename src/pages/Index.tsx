import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Search, Trash2, Building2, Warehouse, Package, ScrollText, FileText, FileSpreadsheet } from "lucide-react";
import { useReport } from "@/context/ReportContext";
import { summarize } from "@/lib/grl019";
import { useState } from "react";

export default function Index() {
  const navigate = useNavigate();
  const { report, removeReport } = useReport();
  const [q, setQ] = useState("");
  const summary = report ? summarize(report) : null;

  const atalhos = [
    { to: "/cadastros/cooperativas", label: "Cooperativas", icon: Building2 },
    { to: "/cadastros/armazens", label: "Armazéns", icon: Warehouse },
    { to: "/cadastros/produtos", label: "Produtos", icon: Package },
    { to: "/cadastros/tipos-contrato", label: "Tipos de Contrato", icon: ScrollText },
    { to: "/cadastros/modelos-nota", label: "Modelos de Nota", icon: FileText },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4 rounded-xl bg-gradient-header p-6 text-primary-foreground shadow-elevated">
          <Logo size={56} />
          <div>
            <h1 className="text-2xl font-extrabold">Modelo de Nota JM</h1>
            <p className="text-sm text-primary-foreground/80">
              Geração de modelos orientativos de notas fiscais a partir do relatório GRL019.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileSpreadsheet className="h-4 w-4 text-primary" /> Importar GRL019</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Importe o relatório Excel. Ele é salvo apenas no navegador.</p>
              <Button onClick={() => navigate("/importar")}><Upload className="mr-1 h-4 w-4" /> Importar / Substituir</Button>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">Relatório atual</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {report && summary ? (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">Arquivo</span><span className="max-w-[60%] truncate font-medium">{report.fileName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Cooperativa</span><span className="font-medium">{report.empresas[0] ?? "-"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Linhas</span><span className="font-medium">{summary.totalLinhas}</span></div>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => removeReport()}><Trash2 className="mr-1 h-4 w-4" /> Limpar relatório</Button>
                </>
              ) : (
                <p className="text-muted-foreground">Nenhum relatório importado.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Localizar contrato e gerar modelo</CardTitle></CardHeader>
          <CardContent>
            <form
              className="flex gap-2"
              onSubmit={(e) => { e.preventDefault(); navigate("/pesquisa"); }}
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Número do contrato..." className="pl-9" />
              </div>
              <Button type="submit" disabled={!report}>Gerar Modelo</Button>
            </form>
          </CardContent>
        </Card>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Cadastros</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {atalhos.map((a) => (
              <button key={a.to} onClick={() => navigate(a.to)} className="flex flex-col items-center gap-2 rounded-lg border bg-card p-4 text-sm font-medium shadow-card transition-colors hover:border-primary hover:text-primary">
                <a.icon className="h-6 w-6" />
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
