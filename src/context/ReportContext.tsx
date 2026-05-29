import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Grl019Report } from "@/lib/types";
import { clearReport, loadReport, saveReport } from "@/lib/idb";

interface ReportContextValue {
  report: Grl019Report | null;
  loading: boolean;
  setReport: (r: Grl019Report) => Promise<void>;
  removeReport: () => Promise<void>;
}

const ReportContext = createContext<ReportContextValue | null>(null);

export function ReportProvider({ children }: { children: ReactNode }) {
  const [report, setReportState] = useState<Grl019Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport()
      .then((r) => setReportState(r ?? null))
      .finally(() => setLoading(false));
  }, []);

  const setReport = async (r: Grl019Report) => {
    await saveReport(r);
    setReportState(r);
  };

  const removeReport = async () => {
    await clearReport();
    setReportState(null);
  };

  return (
    <ReportContext.Provider value={{ report, loading, setReport, removeReport }}>
      {children}
    </ReportContext.Provider>
  );
}

export function useReport() {
  const ctx = useContext(ReportContext);
  if (!ctx) throw new Error("useReport must be used within ReportProvider");
  return ctx;
}
