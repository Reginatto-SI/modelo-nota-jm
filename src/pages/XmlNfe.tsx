import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileUp } from "lucide-react";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { generatePdf } from "@/lib/pdf";
import { NFE_XML_STATUS } from "@/lib/nfeXml";
import { generateNfeXmlBatch, processNfeXmlBatch, type NfeXmlBatchEntry } from "@/lib/nfeXmlBatch";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function XmlNfe() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<NfeXmlBatchEntry[]>([]);
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState("");
  const selected = entries.filter((entry) => entry.selected && entry.status === "ready").length;

  const importFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const sources = await Promise.all(Array.from(files).map(async (file) => ({ name: file.name, xml: await file.text() })));
    // A lista substitui a seleção anterior e permanece apenas na memória desta página.
    setEntries(processNfeXmlBatch(sources));
    setSummary("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const selectReady = () => setEntries((current) => current.map((entry) => ({ ...entry, selected: entry.status === "ready" })));
  const clearSelection = () => setEntries((current) => current.map((entry) => ({ ...entry, selected: false })));
  const toggle = (id: string) => setEntries((current) => current.map((entry) => entry.id === id && entry.status === "ready" ? { ...entry, selected: !entry.selected } : entry));

  const generate = async () => {
    setGenerating(true);
    const result = await generateNfeXmlBatch(entries, generatePdf);
    setGenerating(false);
    const pending = entries.filter((entry) => entry.status !== "ready").length + result.failed;
    const message = `${result.generated} PDF${result.generated === 1 ? "" : "s"} gerado${result.generated === 1 ? "" : "s"}. ${pending} arquivo${pending === 1 ? "" : "s"} com pendência.`;
    setSummary(message);
    result.failed ? toast.warning(message) : toast.success(message);
  };

  return <Layout><div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight">Importar XMLs — Geração de modelos</h1><p className="mt-1 text-muted-foreground">Importe uma ou várias NF-e emitidas pela VERDENA para gerar os modelos dos produtores.</p></div><Button variant="outline" onClick={() => navigate("/rft006")}><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button></div>
    <Card><CardHeader><CardTitle className="text-base">Importação</CardTitle></CardHeader><CardContent className="space-y-3">
      <Input ref={inputRef} type="file" accept=".xml,application/xml,text/xml" multiple onChange={(event) => void importFiles(event.target.files)} className="hidden" />
      <Button onClick={() => inputRef.current?.click()}><FileUp className="mr-2 h-4 w-4" />Selecionar XMLs</Button>
      <p className="text-xs text-muted-foreground">Os XMLs são processados somente neste navegador. Nenhum conteúdo é enviado ou persistido.</p>
    </CardContent></Card>
    {!!entries.length && <Card><CardHeader className="flex-row items-center justify-between gap-3"><CardTitle className="text-base">Arquivos importados</CardTitle><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={selectReady}>Selecionar todas as prontas</Button><Button variant="outline" size="sm" onClick={clearSelection}>Limpar seleção</Button></div></CardHeader><CardContent className="space-y-4">
      <div className="overflow-x-auto rounded-md border"><Table><TableHeader><TableRow><TableHead className="w-12">Seleção</TableHead><TableHead>Nota</TableHead><TableHead>Série</TableHead><TableHead>Produtor</TableHead><TableHead>CPF/CNPJ</TableHead><TableHead>IE</TableHead><TableHead className="text-right">Itens</TableHead><TableHead className="text-right">Valor líquido</TableHead><TableHead>Situação</TableHead><TableHead>Arquivo</TableHead></TableRow></TableHeader><TableBody>{entries.map((entry) => <TableRow key={entry.id}><TableCell><Checkbox checked={entry.selected} disabled={entry.status !== "ready"} onCheckedChange={() => toggle(entry.id)} aria-label={`Selecionar ${entry.fileName}`} /></TableCell><TableCell>{entry.nfe?.nota || "—"}</TableCell><TableCell>{entry.nfe?.serie || "—"}</TableCell><TableCell>{entry.nfe?.produtor.nome || "—"}</TableCell><TableCell>{entry.nfe?.produtor.cpfCnpj || "—"}</TableCell><TableCell>{entry.nfe?.produtor.ie || "—"}</TableCell><TableCell className="text-right">{entry.nfe?.itens.length ?? "—"}</TableCell><TableCell className="text-right">{entry.nfe ? currency.format(entry.nfe.totais.valorLiquido) : "—"}</TableCell><TableCell><Badge variant={entry.status === "ready" ? "default" : "destructive"}>{NFE_XML_STATUS[entry.status]}</Badge></TableCell><TableCell className="max-w-48 truncate" title={entry.fileName}>{entry.fileName}</TableCell></TableRow>)}</TableBody></Table></div>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-muted-foreground">O navegador pode solicitar permissão para baixar vários arquivos.</p>{summary && <p className="mt-1 text-sm font-medium">{summary}</p>}</div><Button disabled={!selected || generating} onClick={() => void generate()}>{generating ? "Gerando..." : `Gerar PDFs selecionados (${selected})`}</Button></div>
    </CardContent></Card>}
  </div></Layout>;
}
