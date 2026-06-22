"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LeakCard from "@/components/dashboard/LeakCard";
import SummaryWidget from "@/components/dashboard/SummaryWidget";
import { loadAnalysis, type StoredAnalysis } from "@/lib/analysis-store";
import type { DbLeak } from "./page";

function formatCHF(n: number) {
  return `CHF ${Math.round(n).toLocaleString("fr-CH")}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-CH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── Trial leak filter (same rule as import page) ─────────────────────────────
// Show up to 2 medium leaks (fill with low). High leaks always locked.
function applyTrialFilter<T extends { priority: string }>(
  leaks: T[],
  isTrial: boolean
): { visible: T[]; hidden: T[]; locked: boolean } {
  if (!isTrial || leaks.length === 0) {
    return { visible: leaks, hidden: [], locked: false };
  }
  const medium  = leaks.filter((l) => l.priority === "medium");
  const low     = leaks.filter((l) => l.priority === "low");
  const visible = [...medium, ...low].slice(0, 2);
  const hidden  = leaks.filter((l) => !visible.includes(l));
  return { visible, hidden, locked: hidden.length > 0 };
}

// ─── Lock wall ─────────────────────────────────────────────────────────────────
function TrialLockWall({
  hiddenCount,
  hiddenSavings,
  totalSavings,
}: {
  hiddenCount: number;
  hiddenSavings: number;
  totalSavings: number;
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-[#1e3a5f]/25 bg-gradient-to-b from-white to-gray-50 p-8 text-center">
      <div className="text-4xl mb-3">🔒</div>
      <p className="font-bold text-[#1e3a5f] text-lg mb-1">
        {hiddenCount} fuite{hiddenCount > 1 ? "s" : ""} masquée{hiddenCount > 1 ? "s" : ""}
      </p>
      <p className="text-gray-500 text-sm mb-1">
        dont vos alertes <span className="font-semibold text-red-600">urgentes</span> — non affichées en essai gratuit
      </p>
      <p className="text-gray-400 text-sm mb-5">
        <span className="font-bold text-green-600">{formatCHF(hiddenSavings)}</span> supplémentaires récupérables
        {" "}sur un total de{" "}
        <span className="font-bold">{formatCHF(totalSavings)}/mois</span>
      </p>
      <a
        href="/checkout?plan=growth"
        className="inline-block bg-[#e85d04] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#c94d00] transition-colors"
      >
        Débloquer l&apos;analyse complète → {formatCHF(totalSavings)}/mois récupérables
      </a>
    </div>
  );
}

export default function DashboardClient({ dbLeaks, plan, paymentSuccess, auditSuccess }: { dbLeaks: DbLeak[]; plan: string; paymentSuccess?: boolean; auditSuccess?: boolean }) {
  const [analysis, setAnalysis] = useState<StoredAnalysis | null | "loading">("loading");

  useEffect(() => {
    setAnalysis(loadAnalysis());
  }, []);

  // Still mounting
  if (analysis === "loading") {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-100 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-gray-100 rounded-2xl" />)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const now = new Date();
  const monthLabel = now.toLocaleDateString("fr-CH", { month: "long", year: "numeric" });

  // ── DB mode: leaks come from server ─────────────────────────────────────────
  if (dbLeaks.length > 0) {
    const totalSavings = dbLeaks.reduce((s, l) => s + l.estimated_savings, 0);
    const roi = totalSavings > 0 ? `×${(totalSavings / 299).toFixed(1)}` : "—";
    const detectedAt = dbLeaks[0]?.detected_at ?? new Date().toISOString();

    const { visible, hidden, locked } = applyTrialFilter(dbLeaks, plan === "trial");
    const hiddenSavings = hidden.reduce((s, l) => s + l.estimated_savings, 0);

    return (
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Payment success banner */}
        {paymentSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-semibold text-green-800">Abonnement activé avec succès !</p>
              <p className="text-sm text-green-600">Toutes les fonctionnalités sont maintenant débloquées.</p>
            </div>
          </div>
        )}
        {auditSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-semibold text-green-800">Audit ponctuel confirmé !</p>
              <p className="text-sm text-green-600">Vous allez recevoir un email avec les prochaines étapes. Importez vos relevés CSV pour démarrer.</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1e3a5f]">Tableau de bord</h1>
            <p className="text-gray-500 text-sm mt-1 capitalize">{monthLabel}</p>
          </div>
          <Link
            href="/import"
            className="text-sm bg-[#e85d04] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#c94d00] transition-colors"
          >
            Nouvelle analyse
          </Link>
        </div>

        {/* Source banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-blue-700">
            <span className="font-semibold">Analyse synchronisée</span>
            {" · "}{dbLeaks.length} fuites détectées
          </p>
          <p className="text-xs text-blue-400">Mis à jour le {fmtDate(detectedAt)}</p>
        </div>

        {/* Summary widgets — always show real totals to create urgency */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryWidget
            label="Fuites détectées"
            value={`${dbLeaks.length} anomalie${dbLeaks.length > 1 ? "s" : ""}`}
            sublabel={locked ? `${visible.length} affichée${visible.length > 1 ? "s" : ""} — ${hidden.length} masquée${hidden.length > 1 ? "s" : ""}` : "Nécessitent votre attention"}
            color="red"
          />
          <SummaryWidget
            label="Économies potentielles"
            value={formatCHF(totalSavings)}
            sublabel="Impact estimé / mois"
            color="green"
          />
          <SummaryWidget
            label="ROI de l'abonnement"
            value={roi}
            sublabel="vs plan Growth 299 CHF/mois"
            color="blue"
          />
        </div>

        {/* Leak list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Top fuites détectées
              <span className="ml-2 text-sm font-normal text-gray-400">triées par impact CHF</span>
            </h2>
            <span className="text-sm font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">
              {formatCHF(totalSavings)}/mois récupérables
            </span>
          </div>
          <div className="space-y-3">
            {visible.map((leak) => (
              <LeakCard
                key={leak.id}
                leak={{
                  id: leak.id,
                  type: leak.type as Parameters<typeof LeakCard>[0]["leak"]["type"],
                  title: leak.title,
                  description: leak.description ?? "",
                  amount: leak.estimated_savings,
                  priority: leak.priority as "high" | "medium" | "low",
                  vendor: leak.vendor ?? "",
                  detectedAt: leak.detected_at,
                }}
              />
            ))}
          </div>
          {locked && (
            <div className="mt-3">
              <TrialLockWall
                hiddenCount={hidden.length}
                hiddenSavings={hiddenSavings}
                totalSavings={totalSavings}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── localStorage mode: CSV-imported analysis ────────────────────────────────

  // Empty state — no analysis anywhere
  if (!analysis) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Tableau de bord</h1>
          <p className="text-gray-500 text-sm mt-1 capitalize">{monthLabel}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryWidget label="Fuites détectées" value="—" sublabel="Aucune analyse effectuée" color="red" />
          <SummaryWidget label="Économies potentielles" value="—" sublabel="Importez un relevé pour commencer" color="green" />
          <SummaryWidget label="ROI abonnement" value="—" sublabel="vs plan Growth 299 CHF/mois" color="blue" />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="text-5xl mb-4">📂</div>
          <h2 className="text-xl font-semibold text-[#1e3a5f] mb-2">Aucune analyse disponible</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
            Importez votre relevé bancaire CSV pour détecter vos fuites financières.
          </p>
          <Link
            href="/import"
            className="inline-block bg-[#1e3a5f] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#162c45] transition-colors"
          >
            Importer un relevé →
          </Link>
        </div>
      </div>
    );
  }

  const { leaks, summary, fileName, savedAt } = analysis;
  const totalSavings = summary.potentialSavings;
  const roi = totalSavings > 0 ? `×${(totalSavings / 299).toFixed(1)}` : "—";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Tableau de bord</h1>
          <p className="text-gray-500 text-sm mt-1 capitalize">{monthLabel}</p>
        </div>
        <Link
          href="/import"
          className="text-sm bg-[#e85d04] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#c94d00] transition-colors"
        >
          Nouvelle analyse
        </Link>
      </div>

      {/* Source banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center justify-between">
        <p className="text-sm text-blue-700">
          <span className="font-semibold">Fichier analysé :</span> {fileName}
          {" · "}{summary.totalTransactions} transactions · {summary.monthsAnalyzed} mois
        </p>
        <p className="text-xs text-blue-400">Analysé le {fmtDate(savedAt)}</p>
      </div>

      {/* Summary widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryWidget
          label="Fuites détectées"
          value={`${leaks.length} anomalie${leaks.length > 1 ? "s" : ""}`}
          sublabel="Nécessitent votre attention"
          color="red"
        />
        <SummaryWidget
          label="Économies potentielles"
          value={formatCHF(totalSavings)}
          sublabel="Impact estimé / mois"
          color="green"
        />
        <SummaryWidget
          label="ROI de l'abonnement"
          value={roi}
          sublabel="vs plan Growth 299 CHF/mois"
          color="blue"
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Transactions analysées", value: String(summary.totalTransactions) },
          { label: "Total dépenses", value: formatCHF(summary.totalDebits) },
          { label: "Mois couverts", value: String(summary.monthsAnalyzed) },
          {
            label: "Période",
            value: summary.dateRange
              ? `${summary.dateRange.from.toLocaleDateString("fr-CH", { month: "short", year: "numeric" })} – ${summary.dateRange.to.toLocaleDateString("fr-CH", { month: "short", year: "numeric" })}`
              : "—",
          },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className="text-sm font-semibold text-gray-800">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Leak list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Top fuites détectées
            <span className="ml-2 text-sm font-normal text-gray-400">triées par impact CHF</span>
          </h2>
          {leaks.length > 0 && (
            <span className="text-sm font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">
              {formatCHF(totalSavings)}/mois récupérables
            </span>
          )}
        </div>

        {leaks.length === 0 ? (
          <div className="bg-green-50 border border-green-100 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-semibold text-green-800">Aucune fuite détectée</p>
            <p className="text-green-600 text-sm mt-1">
              Vos {summary.totalTransactions} transactions analysées semblent correctes.
            </p>
          </div>
        ) : (() => {
          const { visible, hidden, locked } = applyTrialFilter(leaks, plan === "trial");
          const hiddenSavings = hidden.reduce((s, l) => s + l.amount, 0);
          return (
            <>
              <div className="space-y-3">
                {visible.map((leak) => (
                  <LeakCard
                    key={leak.id}
                    leak={{
                      id: leak.id,
                      type: leak.type,
                      title: leak.title,
                      description: leak.description,
                      amount: leak.amount,
                      priority: leak.priority,
                      vendor: leak.vendor,
                      detectedAt: savedAt,
                    }}
                  />
                ))}
              </div>
              {locked && (
                <div className="mt-3">
                  <TrialLockWall
                    hiddenCount={hidden.length}
                    hiddenSavings={hiddenSavings}
                    totalSavings={totalSavings}
                  />
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
