import type { DetectedLeak, AnalysisSummary } from "./csv-parser";
import type { ReportData } from "@/components/pdf/ReportDocument";

export async function downloadAnalysisPDF(
  leaks: DetectedLeak[],
  summary: AnalysisSummary,
  company = "Votre entreprise"
): Promise<void> {
  // Dynamic imports keep @react-pdf/renderer out of the initial client bundle
  // (it contains Node.js APIs that crash in the browser when bundled statically)
  const [{ pdf }, { createElement }, { default: ReportDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("react"),
    import("@/components/pdf/ReportDocument"),
  ]);

  const data: ReportData = {
    company,
    generatedAt: new Date().toISOString(),
    leaks: leaks.map((l) => ({
      type: l.type,
      title: l.title,
      description: l.description,
      estimated_savings: Math.round(l.amount),
      priority: l.priority,
      vendor: l.vendor,
    })),
    totalSavings: Math.round(summary.potentialSavings),
    planPrice: 299,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = createElement(ReportDocument, { data }) as any;
  const blob = await pdf(element).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `profit-leak-rapport-${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
