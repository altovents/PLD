"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  parseCSV,
  detectLeaks,
  computeSummary,
  type Transaction,
  type DetectedLeak,
  type AnalysisSummary,
  type BankFormat,
} from "@/lib/csv-parser";
import { downloadAnalysisPDF } from "@/lib/pdf-client";
import { saveAnalysis } from "@/lib/analysis-store";
import { PERIOD_LABELS } from "@/lib/plan-limits";

// ─── Sub-components ────────────────────────────────────────────────────────────

const FORMAT_LABELS: Record<BankFormat, string> = {
  postfinance: "PostFinance",
  ubs:         "UBS",
  raiffeisen:  "Raiffeisen",
  generic:     "Autre banque",
};

const LEAK_ICONS: Record<string, string> = {
  duplicate:            "🔁",
  unused_subscription:  "💸",
  price_increase:       "📈",
  bank_fees:            "🏦",
  overlapping_services: "🔀",
  annual_optimization:  "📅",
  progressive_drift:    "📉",
  currency_fees:        "💱",
  ghost_reactivation:   "👻",
  late_fees:            "⏰",
};

const LEAK_BG: Record<string, string> = {
  duplicate:            "bg-red-50 border-red-100",
  unused_subscription:  "bg-orange-50 border-orange-100",
  price_increase:       "bg-yellow-50 border-yellow-100",
  bank_fees:            "bg-blue-50 border-blue-100",
  overlapping_services: "bg-purple-50 border-purple-100",
  annual_optimization:  "bg-teal-50 border-teal-100",
  progressive_drift:    "bg-amber-50 border-amber-100",
  currency_fees:        "bg-indigo-50 border-indigo-100",
  ghost_reactivation:   "bg-rose-50 border-rose-100",
  late_fees:            "bg-red-50 border-red-100",
};

const PRIORITY_BADGE: Record<string, string> = {
  high:   "bg-red-100 text-red-700",
  medium: "bg-orange-100 text-orange-700",
  low:    "bg-gray-100 text-gray-600",
};

const PRIORITY_LABEL: Record<string, string> = {
  high: "Urgent", medium: "Moyen", low: "Faible",
};

function LeakResult({ leak }: { leak: DetectedLeak }) {
  return (
    <div className={`rounded-xl border p-5 ${LEAK_BG[leak.type] ?? "bg-gray-50 border-gray-100"}`}>
      <div className="flex items-start gap-4">
        <div className="text-2xl flex-shrink-0 mt-0.5">
          {LEAK_ICONS[leak.type] ?? "💡"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-gray-800 text-sm">{leak.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[leak.priority]}`}>
              {PRIORITY_LABEL[leak.priority]}
            </span>
            {leak.timeToFix && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/60 text-gray-500">
                ⏱ {leak.timeToFix}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600">{leak.description}</p>
          <p className="text-xs text-gray-400 mt-1">{leak.transactions.length} transaction(s) concernée(s)</p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-lg font-bold text-green-600">+{leak.amount.toFixed(0)} CHF</div>
          <div className="text-xs text-gray-400">/mois récupérables</div>
        </div>
      </div>
      {leak.actionItems && leak.actionItems.length > 0 && (
        <div className="mt-3 ml-10 space-y-1.5 border-t border-black/5 pt-3">
          {leak.actionItems.map((action, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-green-600 text-xs mt-0.5 flex-shrink-0">→</span>
              <p className="text-xs text-gray-600">{action}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryBar({ summary }: { summary: AnalysisSummary }) {
  const fmt = (n: number) => n.toLocaleString("fr-CH", { maximumFractionDigits: 0 });
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { label: "Transactions analysées", value: String(summary.totalTransactions),                    color: "text-[#1e3a5f]" },
        { label: "Total dépenses",         value: `${fmt(summary.totalDebits)} CHF`,                    color: "text-gray-700"  },
        { label: "Fuites détectées",       value: String(summary.leaksFound),                           color: "text-orange-600"},
        { label: "Economies potentielles", value: `${fmt(summary.potentialSavings)} CHF/mois`,          color: "text-green-600" },
      ].map((stat) => (
        <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
          <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Import quota badge ────────────────────────────────────────────────────────

interface ImportStatus {
  plan: string;
  used: number;
  limit: number | null;
  period: "monthly" | "total";
}

function QuotaBadge({ status }: { status: ImportStatus | null }) {
  if (!status) return null;

  const unlimited = status.limit === null;
  const remaining = unlimited ? null : status.limit! - status.used;
  const atLimit   = !unlimited && remaining !== null && remaining <= 0;
  const periodLabel = PERIOD_LABELS[status.period];

  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border ${
      atLimit
        ? "bg-red-50 border-red-200 text-red-700"
        : remaining === 1
        ? "bg-orange-50 border-orange-200 text-orange-700"
        : "bg-gray-50 border-gray-200 text-gray-600"
    }`}>
      <span>{atLimit ? "⛔" : remaining === 1 ? "⚠️" : "📊"}</span>
      {unlimited ? (
        <span>Imports <strong>illimités</strong> (Plan Pro)</span>
      ) : atLimit ? (
        <span>
          {status.plan === "trial"
            ? <>Essai utilisé — votre import gratuit a déjà été effectué. <a href="/#pricing" className="underline font-semibold">Prendre un abonnement →</a></>
            : <>Limite atteinte — <strong>{status.used}/{status.limit}</strong> imports {periodLabel}. <a href="/settings" className="underline font-semibold">Gérer l&apos;abonnement →</a></>
          }
        </span>
      ) : (
        <span>
          {status.plan === "trial"
            ? <><strong>1 import gratuit</strong> disponible — résultats partiels (2 fuites affichées)</>
            : <><strong>{remaining}</strong> import{(remaining ?? 0) > 1 ? "s" : ""} restant{(remaining ?? 0) > 1 ? "s" : ""} {periodLabel} ({status.used}/{status.limit})</>
          }
        </span>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

type Stage = "idle" | "preview" | "results";

export default function ImportPage() {
  const router = useRouter();

  const [stage, setStage]             = useState<Stage>("idle");
  const [isDragging, setIsDragging]   = useState(false);
  const [fileName, setFileName]       = useState("");
  const [format, setFormat]           = useState<BankFormat>("generic");
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [leaks, setLeaks]             = useState<DetectedLeak[]>([]);
  const [summary, setSummary]         = useState<AnalysisSummary | null>(null);
  const [isAnalyzing, setIsAnalyzing]   = useState(false);
  const [isEnriching, setIsEnriching]   = useState(false);
  const [isSaving, setIsSaving]         = useState(false);
  const [saveError, setSaveError]       = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfError, setPdfError]         = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch import quota on mount
  useEffect(() => {
    fetch("/api/import/status")
      .then((r) => r.json())
      .then((data: ImportStatus) => setImportStatus(data))
      .catch(() => null);
  }, []);

  const atLimit = importStatus !== null
    && importStatus.limit !== null
    && importStatus.used >= importStatus.limit;

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".txt")) {
      setParseErrors(["Veuillez sélectionner un fichier CSV."]);
      return;
    }
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = parseCSV(content);
      setTransactions(result.transactions);
      setFormat(result.format);
      setParseErrors(result.errors);
      setStage("preview");
    };
    reader.readAsText(file, "UTF-8");
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setSaveError(null);

    // Small timeout so the spinner is visible
    await new Promise((r) => setTimeout(r, 800));

    const detected = detectLeaks(transactions);
    const stats    = computeSummary(transactions, detected);
    setLeaks(detected);
    setSummary(stats);
    setIsAnalyzing(false);

    // Save to localStorage immediately (fast dashboard display)
    saveAnalysis({ leaks: detected, transactions, summary: stats, fileName });

    // Enrich with Claude AI (non-blocking — show results first)
    if (detected.length > 0) {
      setIsEnriching(true);
      fetch("/api/claude-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaks: detected.map((l) => ({
            type: l.type,
            title: l.title,
            description: l.description,
            amount: l.amount,
            priority: l.priority,
            vendor: l.vendor,
            transactionCount: l.transactions.length,
          })),
        }),
      })
        .then((r) => r.ok ? r.json() : null)
        .then((data: { leaks: Array<{ enrichedDescription?: string; actionItems?: string[]; timeToFix?: string }> } | null) => {
          if (!data?.leaks) return;
          setLeaks((prev) =>
            prev.map((leak, i) => ({
              ...leak,
              description:  data.leaks[i]?.enrichedDescription ?? leak.description,
              actionItems:  data.leaks[i]?.actionItems         ?? leak.actionItems,
              timeToFix:    data.leaks[i]?.timeToFix           ?? leak.timeToFix,
            }))
          );
        })
        .catch(() => null)
        .finally(() => setIsEnriching(false));
    }

    // Save to DB
    setIsSaving(true);
    try {
      const res = await fetch("/api/import/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions: transactions.map((t) => ({
            date:        t.date.toISOString(),
            description: t.description,
            vendor:      t.vendor,
            amount:      t.amount,
            currency:    t.currency,
          })),
          leaks: detected.map((l) => ({
            type:        l.type,
            title:       l.title,
            description: l.description,
            amount:      l.amount,
            priority:    l.priority,
            vendor:      l.vendor,
          })),
          filename: fileName,
          format,
        }),
      });

      if (res.status === 403) {
        const body = await res.json() as { error: string; used: number; limit: number; period: string };
        if (body.error === "limit_reached") {
          setSaveError(`Limite atteinte (${body.used}/${body.limit} imports ${body.period === "monthly" ? "ce mois-ci" : "au total"}). Passez à un plan supérieur.`);
          setImportStatus((prev) => prev ? { ...prev, used: body.used, limit: body.limit } : prev);
        }
      } else if (!res.ok) {
        setSaveError("Erreur lors de la sauvegarde. Vos résultats sont affichés mais ne seront pas persistés.");
      } else {
        // Refresh quota
        const status = await fetch("/api/import/status").then((r) => r.json()) as ImportStatus;
        setImportStatus(status);
      }
    } catch {
      setSaveError("Erreur réseau. Vos résultats sont disponibles localement.");
    } finally {
      setIsSaving(false);
      setStage("results");
    }
  };

  const reset = () => {
    setStage("idle");
    setFileName("");
    setTransactions([]);
    setLeaks([]);
    setSummary(null);
    setParseErrors([]);
    setPdfError(null);
    setSaveError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handlePdfDownload = async () => {
    if (!summary) return;
    setIsPdfLoading(true);
    setPdfError(null);
    try {
      await downloadAnalysisPDF(leaks, summary);
    } catch {
      setPdfError("Erreur lors de la génération du PDF. Réessayez.");
    } finally {
      setIsPdfLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Importer un relevé bancaire</h1>
          <p className="text-gray-500 text-sm mt-1">
            Exportez votre relevé depuis e-banking (format CSV) et déposez-le ici.
          </p>
        </div>
      </div>

      {/* Import quota */}
      <QuotaBadge status={importStatus} />

      {/* Bank export guide */}
      {stage === "idle" && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-blue-800">Comment exporter votre relevé :</p>
            <a
              href="/exemple-postfinance.csv"
              download
              className="text-xs text-[#1e3a5f] font-semibold border border-[#1e3a5f] px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Télécharger un fichier exemple
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { bank: "PostFinance", steps: "E-Finance → Compte → Mouvements → Exporter (CSV)" },
              { bank: "UBS",        steps: "E-Banking → Compte courant → Historique → Télécharger CSV" },
              { bank: "Raiffeisen", steps: "Raiffeisen e-banking → Paiements → Historique → Exporter" },
            ].map((b) => (
              <div key={b.bank} className="bg-white rounded-xl p-4 border border-blue-100">
                <p className="text-xs font-bold text-blue-700 mb-1">{b.bank}</p>
                <p className="text-xs text-gray-500">{b.steps}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drop zone */}
      {stage === "idle" && (
        <div
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
            atLimit
              ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
              : isDragging
              ? "border-[#1e3a5f] bg-blue-50 cursor-pointer"
              : "border-gray-200 hover:border-[#1e3a5f] hover:bg-gray-50 cursor-pointer"
          }`}
          onDragOver={(e) => { if (!atLimit) { e.preventDefault(); setIsDragging(true); } }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={atLimit ? undefined : onDrop}
          onClick={() => { if (!atLimit) fileRef.current?.click(); }}
        >
          <div className="text-4xl mb-4">{isDragging ? "📂" : "📁"}</div>
          <p className="text-gray-700 font-semibold mb-1">Glissez votre fichier CSV ici</p>
          <p className="text-gray-400 text-sm mb-5">ou cliquez pour parcourir vos fichiers</p>
          <button
            disabled={atLimit}
            className="bg-[#1e3a5f] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#162c45] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={(e) => { e.stopPropagation(); if (!atLimit) fileRef.current?.click(); }}
          >
            Sélectionner un fichier
          </button>
          <p className="text-xs text-gray-400 mt-3">
            Formats supportés : PostFinance, UBS, Raiffeisen, CSV générique
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      )}

      {/* Parse errors */}
      {parseErrors.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          {parseErrors.map((e) => (
            <p key={e} className="text-sm text-yellow-800">{e}</p>
          ))}
        </div>
      )}

      {/* Preview */}
      {stage === "preview" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold text-gray-800">{fileName}</p>
                <p className="text-sm text-gray-400">
                  Format détecté : <span className="font-medium text-[#1e3a5f]">{FORMAT_LABELS[format]}</span>
                  {" · "}
                  {transactions.length} transactions lues
                </p>
              </div>
              <button onClick={reset} className="text-sm text-gray-400 hover:text-gray-600">
                ✕ Changer de fichier
              </button>
            </div>

            {/* Preview table */}
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    {["Date", "Description", "Fournisseur", "Montant"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 8).map((t, i) => (
                    <tr key={i} className="border-t border-gray-50">
                      <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                        {t.date.toLocaleDateString("fr-CH")}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700 max-w-[200px] truncate">{t.description}</td>
                      <td className="px-4 py-2.5 text-gray-600">{t.vendor}</td>
                      <td className={`px-4 py-2.5 font-medium whitespace-nowrap ${t.amount < 0 ? "text-red-600" : "text-green-600"}`}>
                        {t.amount.toFixed(2)} {t.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transactions.length > 8 && (
                <p className="text-center text-xs text-gray-400 py-2">
                  + {transactions.length - 8} autres transactions
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={runAnalysis}
              disabled={isAnalyzing || transactions.length === 0}
              className="flex-1 bg-[#1e3a5f] text-white py-3.5 rounded-xl font-semibold hover:bg-[#162c45] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Analyse en cours…
                </>
              ) : (
                "Lancer l'analyse des fuites →"
              )}
            </button>
            <button
              onClick={reset}
              className="px-5 py-3.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {stage === "results" && summary && (
        <div className="space-y-6">
          <SummaryBar summary={summary} />

          {/* Claude enrichment indicator */}
          {isEnriching && (
            <div className="flex items-center gap-3 bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
              <span className="animate-spin inline-block w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full flex-shrink-0" />
              <p className="text-sm text-violet-700">
                <span className="font-semibold">Analyse IA en cours</span> — enrichissement des descriptions et actions recommandées…
              </p>
            </div>
          )}

          {/* Saving state */}
          {isSaving && (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <span className="animate-spin inline-block w-4 h-4 border-2 border-[#1e3a5f] border-t-transparent rounded-full flex-shrink-0" />
              <p className="text-sm text-blue-700">Sauvegarde en cours…</p>
            </div>
          )}

          {/* Save error */}
          {saveError && !isSaving && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-sm text-red-700">{saveError}</p>
              {saveError.includes("Limite") && (
                <a href="/settings" className="text-xs text-red-600 underline font-semibold mt-1 inline-block">
                  Gérer mon abonnement →
                </a>
              )}
            </div>
          )}

          {/* Success banner */}
          {!isSaving && !saveError && (
            <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-xl px-4 py-3">
              <p className="text-sm text-green-700">
                <span className="font-semibold">✓ Analyse sauvegardée</span> — accessible depuis toutes vos sessions
              </p>
              <button
                onClick={() => router.push("/dashboard")}
                className="text-xs font-semibold text-green-700 border border-green-300 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors whitespace-nowrap"
              >
                Voir le dashboard →
              </button>
            </div>
          )}

          {leaks.length === 0 ? (
            <div className="bg-green-50 border border-green-100 rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold text-green-800 text-lg">Aucune fuite détectée</p>
              <p className="text-green-600 text-sm mt-1">
                Vos {summary.totalTransactions} transactions analysées semblent correctes.
              </p>
            </div>
          ) : (() => {
            const isTrial = importStatus?.plan === "trial";
            // Trial shows up to 2 medium-priority leaks (never the high ones).
            // If fewer than 2 medium exist, fill with low. High leaks always stay locked.
            const mediumLeaks = leaks.filter((l) => l.priority === "medium");
            const lowLeaks    = leaks.filter((l) => l.priority === "low");
            const trialVisible = isTrial
              ? [...mediumLeaks, ...lowLeaks].slice(0, 2)
              : leaks;
            const showLock = isTrial && leaks.length > trialVisible.length;
            const visibleLeaks = showLock ? trialVisible : leaks;
            const hiddenLeaks  = showLock
              ? leaks.filter((l) => !trialVisible.includes(l))
              : [];
            const hiddenSavings = hiddenLeaks.reduce((s, l) => s + l.amount, 0);

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-[#1e3a5f] text-lg">
                    {leaks.length} fuite{leaks.length > 1 ? "s" : ""} détectée{leaks.length > 1 ? "s" : ""}
                  </h2>
                  <span className="text-sm text-green-600 font-semibold bg-green-50 px-3 py-1 rounded-full">
                    {summary.potentialSavings.toFixed(0)} CHF/mois récupérables
                  </span>
                </div>

                {/* Visible leaks */}
                {visibleLeaks.map((leak) => (
                  <LeakResult key={leak.id} leak={leak} />
                ))}

                {/* Trial lock wall */}
                {showLock && (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-[#1e3a5f]/30">
                    {/* Blurred teaser cards */}
                    <div className="select-none pointer-events-none" style={{ filter: "blur(5px)", opacity: 0.4 }}>
                      {hiddenLeaks.slice(0, 3).map((leak) => (
                        <div
                          key={leak.id}
                          className={`border-b last:border-0 p-5 flex items-start gap-4 ${LEAK_BG[leak.type] ?? "bg-gray-50 border-gray-100"}`}
                        >
                          <div className="text-2xl flex-shrink-0 mt-0.5">{LEAK_ICONS[leak.type] ?? "💡"}</div>
                          <div className="flex-1">
                            <div className="h-3 bg-gray-400 rounded w-48 mb-2" />
                            <div className="h-2.5 bg-gray-300 rounded w-64" />
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-lg font-bold text-green-600">+{leak.amount.toFixed(0)} CHF</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Lock overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm px-6 py-8 text-center">
                      <div className="text-4xl mb-3">🔒</div>
                      <p className="font-bold text-[#1e3a5f] text-lg mb-1">
                        {hiddenLeaks.length} fuite{hiddenLeaks.length > 1 ? "s" : ""} masquée{hiddenLeaks.length > 1 ? "s" : ""}
                      </p>
                      <p className="text-gray-600 text-sm mb-1">
                        <span className="font-bold text-green-600">{hiddenSavings.toFixed(0)} CHF/mois</span> supplémentaires récupérables
                      </p>
                      <p className="text-gray-400 text-xs mb-5">
                        L&apos;essai gratuit affiche les 2 premières fuites. Débloquez l&apos;analyse complète avec un abonnement.
                      </p>
                      <a
                        href="/#pricing"
                        className="inline-block bg-[#1e3a5f] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#162c45] transition-colors"
                      >
                        Voir les offres → Récupérer {summary.potentialSavings.toFixed(0)} CHF/mois
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="space-y-2 pt-2">
            <div className="flex gap-3">
              <button
                onClick={reset}
                className="flex-1 bg-[#1e3a5f] text-white py-3 rounded-xl font-semibold hover:bg-[#162c45] transition-colors text-sm"
              >
                Analyser un autre fichier
              </button>
              <button
                onClick={handlePdfDownload}
                disabled={isPdfLoading}
                className="flex-1 border border-[#1e3a5f] text-[#1e3a5f] py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-sm disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isPdfLoading ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-[#1e3a5f] border-t-transparent rounded-full" />
                    Génération…
                  </>
                ) : (
                  "📄 Exporter en PDF"
                )}
              </button>
            </div>
            {pdfError && (
              <p className="text-xs text-red-500 text-center">{pdfError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
