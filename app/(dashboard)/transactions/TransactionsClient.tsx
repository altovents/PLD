"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadAnalysis } from "@/lib/analysis-store";
import type { Transaction } from "@/lib/csv-parser";

const CATEGORY_COLORS: Record<string, string> = {
  Adobe:           "bg-red-100 text-red-700",
  "Microsoft 365": "bg-blue-100 text-blue-700",
  Slack:           "bg-purple-100 text-purple-700",
  Zoom:            "bg-blue-100 text-blue-700",
  Dropbox:         "bg-blue-100 text-blue-700",
  Salesforce:      "bg-blue-100 text-blue-700",
  HubSpot:         "bg-orange-100 text-orange-700",
  Swisscom:        "bg-yellow-100 text-yellow-700",
  default:         "bg-gray-100 text-gray-600",
};

function vendorColor(vendor: string) {
  return CATEGORY_COLORS[vendor] ?? CATEGORY_COLORS.default;
}

export default function TransactionsClient() {
  const [transactions, setTransactions] = useState<Transaction[] | null | "loading">("loading");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "debit" | "credit">("all");

  useEffect(() => {
    const stored = loadAnalysis();
    setTransactions(stored ? stored.transactions : null);
  }, []);

  if (transactions === "loading") {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-100 rounded-xl" />
        <div className="h-64 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  const filtered = (transactions ?? []).filter((t) => {
    const matchSearch =
      !search ||
      t.vendor.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "debit" && t.amount < 0) ||
      (filter === "credit" && t.amount >= 0);
    return matchSearch && matchFilter;
  });

  const sorted = [...filtered].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Transactions</h1>
          <p className="text-gray-500 text-sm mt-1">Historique de vos flux financiers</p>
        </div>
        <Link
          href="/import"
          className="flex items-center gap-2 bg-[#1e3a5f] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#162c45] transition-colors"
        >
          Importer un nouveau relevé
        </Link>
      </div>

      {/* Empty state */}
      {!transactions || transactions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="text-5xl mb-4">📂</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Aucune transaction disponible
          </h2>
          <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
            Importez votre relevé bancaire CSV pour afficher vos transactions.
          </p>
          <Link
            href="/import"
            className="inline-block bg-[#1e3a5f] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#162c45] transition-colors"
          >
            Importer un relevé →
          </Link>
          <p className="text-xs text-gray-400 mt-3">
            Compatible PostFinance, UBS, Raiffeisen et CSV générique
          </p>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Rechercher un fournisseur, une description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
            <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm">
              {(["all", "debit", "credit"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2.5 font-medium transition-colors ${
                    filter === f
                      ? "bg-[#1e3a5f] text-white"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {{ all: "Tous", debit: "Débits", credit: "Crédits" }[f]}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {sorted.length} transaction{sorted.length > 1 ? "s" : ""}
            </span>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
                  <tr>
                    <th className="text-left px-6 py-3">Date</th>
                    <th className="text-left px-6 py-3">Description</th>
                    <th className="text-left px-6 py-3">Fournisseur</th>
                    <th className="text-right px-6 py-3">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sorted.map((tx, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                        {tx.date.toLocaleDateString("fr-CH")}
                      </td>
                      <td className="px-6 py-3 text-gray-700 max-w-xs truncate">
                        {tx.description}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${vendorColor(tx.vendor)}`}>
                          {tx.vendor}
                        </span>
                      </td>
                      <td className={`px-6 py-3 text-right font-medium whitespace-nowrap ${tx.amount < 0 ? "text-red-600" : "text-green-600"}`}>
                        {tx.amount < 0 ? "−" : "+"}
                        {Math.abs(tx.amount).toLocaleString("fr-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {tx.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {sorted.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">
                Aucune transaction ne correspond à votre recherche.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
