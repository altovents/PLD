"use client";

import { useEffect, useState, useMemo } from "react";
import { loadAnalysis } from "@/lib/analysis-store";
import {
  categorizeTransaction,
  buildCategorySummary,
  normalizeVendorKey,
  CATEGORIES,
  type CategorizedTransaction,
  type CategoryKey,
} from "@/lib/categorizer";
import { generateStandardCSV, generateBexioCSV } from "@/lib/export-accountant";
import PaywallOverlay from "@/components/dashboard/PaywallOverlay";
import Link from "next/link";

const FREE_LIMIT = 5;

type ExportFormat = "standard" | "bexio";

const CATEGORY_OPTIONS = Object.entries(CATEGORIES).map(([key, info]) => ({
  value: key as CategoryKey,
  label: `${info.icon} ${info.label}`,
}));

export default function ComptabiliteClient({ plan }: { plan: string }) {
  const isPaid = plan !== "trial";
  const [transactions, setTransactions] = useState<CategorizedTransaction[] | null | "loading">("loading");
  const [learnedMappings, setLearnedMappings] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "review" | "ok">("all");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("standard");
  const [savingVendor, setSavingVendor] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<string>("all");

  // Load learned mappings from API
  useEffect(() => {
    fetch("/api/categorizer/learn")
      .then((r) => r.ok ? r.json() : {})
      .then((data: Record<string, string>) => setLearnedMappings(data))
      .catch(() => {});
  }, []);

  // Load + categorize transactions
  useEffect(() => {
    if (learnedMappings === null) return;
    const stored = loadAnalysis();
    if (!stored) {
      setTransactions(null);
      return;
    }

    const categorized: CategorizedTransaction[] = stored.transactions.map((tx) => {
      const result = categorizeTransaction(
        tx.vendor,
        tx.description,
        tx.amount,
        learnedMappings
      );
      const vendorKey = normalizeVendorKey(tx.vendor);
      return {
        id: `${tx.date.getTime()}-${tx.vendor}-${tx.amount}`,
        date: tx.date.toISOString().slice(0, 10),
        vendor: tx.vendor,
        description: tx.description,
        amount: tx.amount,
        currency: tx.currency ?? "CHF",
        category: result.category,
        confidence: result.confidence,
        vatRate: result.vatRate,
        vatAmount: result.vatAmount,
        amountHT: result.amountHT,
        isManual: !!learnedMappings[vendorKey],
      };
    });

    setTransactions(categorized);
  }, [learnedMappings]);

  // Available months for filter
  const availableMonths = useMemo(() => {
    if (!transactions || transactions === "loading") return [];
    const months = new Set(transactions.map((tx) => tx.date.slice(0, 7)));
    return Array.from(months).sort().reverse();
  }, [transactions]);

  // Filtered transactions
  const filtered = useMemo(() => {
    if (!transactions || transactions === "loading") return [];
    return transactions.filter((tx) => {
      const matchMonth = monthFilter === "all" || tx.date.startsWith(monthFilter);
      const matchSearch =
        !search ||
        tx.vendor.toLowerCase().includes(search.toLowerCase()) ||
        tx.description.toLowerCase().includes(search.toLowerCase());
      const needsReview = tx.confidence === "low" || tx.category === "inconnu";
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "review" && needsReview) ||
        (filterStatus === "ok" && !needsReview);
      return matchMonth && matchSearch && matchStatus;
    });
  }, [transactions, search, filterStatus, monthFilter]);

  // Summary for current month filter
  const summary = useMemo(() => {
    if (!transactions || transactions === "loading") return [];
    const scope = monthFilter === "all" ? transactions : transactions.filter((tx) => tx.date.startsWith(monthFilter));
    return buildCategorySummary(scope);
  }, [transactions, monthFilter]);

  const toReviewCount = useMemo(() => {
    if (!transactions || transactions === "loading") return 0;
    return transactions.filter((tx) => tx.confidence === "low" || tx.category === "inconnu").length;
  }, [transactions]);

  async function handleCategoryChange(tx: CategorizedTransaction, newCategory: CategoryKey) {
    const vendorKey = normalizeVendorKey(tx.vendor);
    setSavingVendor(vendorKey);

    // Update local state immediately
    setTransactions((prev) => {
      if (!prev || prev === "loading") return prev;
      return prev.map((t) =>
        normalizeVendorKey(t.vendor) === vendorKey
          ? {
              ...t,
              category: newCategory,
              isManual: true,
              confidence: "high" as const,
              vatRate: CATEGORIES[newCategory].vat,
              vatAmount: CATEGORIES[newCategory].vat
                ? Math.round((Math.abs(t.amount) - Math.abs(t.amount) / (1 + CATEGORIES[newCategory].vat!)) * 100) / 100
                : 0,
              amountHT: CATEGORIES[newCategory].vat
                ? Math.round((Math.abs(t.amount) / (1 + CATEGORIES[newCategory].vat!)) * 100) / 100
                : Math.abs(t.amount),
            }
          : t
      );
    });

    // Save to server
    await fetch("/api/categorizer/learn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendor_key: vendorKey, category: newCategory }),
    }).catch(() => {});

    setLearnedMappings((prev) => ({ ...prev, [vendorKey]: newCategory }));
    setSavingVendor(null);
  }

  function handleExport() {
    if (!transactions || transactions === "loading") return;
    const scope = monthFilter === "all"
      ? transactions
      : transactions.filter((tx) => tx.date.startsWith(monthFilter));

    const sorted = [...scope].sort((a, b) => a.date.localeCompare(b.date));
    const csv = exportFormat === "bexio"
      ? generateBexioCSV(sorted)
      : generateStandardCSV(sorted);

    const filename = exportFormat === "bexio"
      ? `bexio-import-${monthFilter === "all" ? "complet" : monthFilter}.csv`
      : `comptabilite-${monthFilter === "all" ? "complet" : monthFilter}.csv`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (transactions === "loading") {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-gray-100 rounded-xl" />
        <div className="h-32 bg-gray-100 rounded-2xl" />
        <div className="h-96 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Préparation comptable</h1>
          <p className="text-gray-500 text-sm mt-1">Catégorisation et export pour votre fiduciaire</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="text-5xl mb-4">🧾</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Aucune transaction disponible</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
            Importez votre relevé bancaire CSV pour lancer la catégorisation automatique.
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

  const totalTTC = summary.filter((s) => s.category !== "remboursement" && s.category !== "virement_interne").reduce((a, s) => a + s.totalTTC, 0);
  const totalVAT = summary.reduce((a, s) => a + s.totalVAT, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Préparation comptable</h1>
          <p className="text-gray-500 text-sm mt-1">
            {transactions.length} transactions •{" "}
            {toReviewCount > 0 && (
              <span className="text-orange-600 font-medium">{toReviewCount} à vérifier</span>
            )}
            {toReviewCount === 0 && <span className="text-green-600 font-medium">tout est catégorisé</span>}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          >
            <option value="standard">Excel / CSV standard</option>
            <option value="bexio">Format Bexio</option>
          </select>
          {isPaid ? (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 bg-[#e85d04] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#c94d00] transition-colors"
            >
              ⬇ Exporter pour le fiduciaire
            </button>
          ) : (
            <a
              href="/#pricing"
              className="flex items-center gap-2 bg-gray-200 text-gray-500 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-not-allowed"
              title="Disponible avec un abonnement payant"
            >
              🔒 Exporter — Plan payant requis
            </a>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Total dépenses TTC</p>
          <p className="text-2xl font-bold text-[#1e3a5f]">
            {totalTTC.toLocaleString("fr-CH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} CHF
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">TVA récupérable estimée</p>
          <p className="text-2xl font-bold text-green-600">
            {totalVAT.toLocaleString("fr-CH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} CHF
          </p>
          <p className="text-xs text-gray-400 mt-1">À confirmer par votre fiduciaire</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Transactions à vérifier</p>
          <p className={`text-2xl font-bold ${toReviewCount > 0 ? "text-orange-500" : "text-green-600"}`}>
            {toReviewCount}
          </p>
          <p className="text-xs text-gray-400 mt-1">catégorie ou TVA inconnue</p>
        </div>
      </div>

      {/* Category summary */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Répartition par catégorie</h2>
        <div className="grid grid-cols-2 gap-2">
          {summary.slice(0, 10).map((cat) => (
            <div key={cat.category} className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-700 flex items-center gap-2">
                <span>{cat.icon}</span>
                {cat.label}
                <span className="text-gray-400 text-xs">({cat.count})</span>
              </span>
              <div className="text-right">
                <span className="text-sm font-semibold text-gray-800">
                  {cat.totalTTC.toLocaleString("fr-CH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} CHF
                </span>
                {cat.totalVAT > 0 && (
                  <span className="text-xs text-green-600 ml-2">TVA {cat.totalVAT.toLocaleString("fr-CH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Rechercher un fournisseur…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
        />
        {availableMonths.length > 1 && (
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          >
            <option value="all">Tous les mois</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        )}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm">
          {(["all", "review", "ok"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-4 py-2.5 font-medium transition-colors ${
                filterStatus === f ? "bg-[#1e3a5f] text-white" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {{ all: "Tous", review: "À vérifier", ok: "Catégorisés" }[f]}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {filtered.length} ligne{filtered.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Transaction table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Fournisseur</th>
                <th className="text-right px-4 py-3">Montant TTC</th>
                <th className="text-left px-4 py-3 w-56">Catégorie</th>
                <th className="text-right px-4 py-3">TVA est.</th>
                <th className="text-right px-4 py-3">Montant HT est.</th>
                <th className="text-center px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(isPaid ? filtered : filtered.slice(0, FREE_LIMIT)).map((tx) => {
                const needsReview = tx.confidence === "low" || tx.category === "inconnu";
                const vendorKey = normalizeVendorKey(tx.vendor);
                const isSaving = savingVendor === vendorKey;
                return (
                  <tr
                    key={tx.id}
                    className={`hover:bg-gray-50 transition-colors ${needsReview ? "bg-orange-50/30" : ""}`}
                  >
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{tx.date}</td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <p className="font-medium text-gray-800 truncate">{tx.vendor}</p>
                      <p className="text-gray-400 text-xs truncate">{tx.description}</p>
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${tx.amount < 0 ? "text-red-600" : "text-green-600"}`}>
                      {tx.amount < 0 ? "−" : "+"}
                      {Math.abs(tx.amount).toLocaleString("fr-CH", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={tx.category}
                        onChange={(e) => handleCategoryChange(tx, e.target.value as CategoryKey)}
                        disabled={isSaving}
                        className={`w-full px-2 py-1 border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] transition-colors ${
                          needsReview
                            ? "border-orange-200 bg-orange-50 text-orange-800"
                            : tx.isManual
                            ? "border-blue-200 bg-blue-50 text-blue-800"
                            : "border-gray-200 bg-gray-50 text-gray-700"
                        } ${isSaving ? "opacity-50" : ""}`}
                      >
                        {CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500 whitespace-nowrap">
                      {tx.vatRate !== null
                        ? `${(tx.vatRate * 100).toFixed(1)}%`
                        : <span className="text-orange-500">?</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-600 whitespace-nowrap">
                      {tx.amountHT !== null
                        ? tx.amountHT.toLocaleString("fr-CH", { minimumFractionDigits: 2 })
                        : <span className="text-orange-500">?</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {needsReview ? (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">⚠ Vérifier</span>
                      ) : tx.isManual ? (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">✓ Corrigé</span>
                      ) : (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Auto</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">
            Aucune transaction ne correspond aux filtres.
          </p>
        )}
        {!isPaid && filtered.length > FREE_LIMIT && (
          <PaywallOverlay
            visibleCount={FREE_LIMIT}
            totalCount={filtered.length}
            feature="écritures"
          />
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-gray-400 text-center pb-4">
        TVA estimée automatiquement selon les catégories — à confirmer par votre fiduciaire avant saisie comptable.
        {" "}Profit Leak Detection n&apos;est pas un outil comptable certifié.
      </p>
    </div>
  );
}
