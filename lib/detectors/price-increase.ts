import type { DbTransaction, LeakCandidate, CompanyContext } from "@/lib/types";

/**
 * Détecte les hausses soudaines chez un fournisseur :
 * même fournisseur, variation > 10% vs moyenne des 3 derniers mois complets.
 *
 * Roadmap: "Même fournisseur, variation >10% vs moyenne 3 derniers mois"
 */
export function detectPriceIncreases(transactions: DbTransaction[], context?: CompanyContext): LeakCandidate[] {
  const debits = transactions.filter((tx) => tx.amount < 0);
  const trustedVendors = (context?.trusted_vendors ?? []).map((v) => v.toLowerCase());

  // Group by vendor → month → total
  const vendorMonths: Record<string, Record<string, number>> = {};

  for (const tx of debits) {
    const vendor = tx.vendor ?? tx.description?.slice(0, 40);
    if (!vendor) continue;
    const monthKey = tx.date.slice(0, 7);
    if (!vendorMonths[vendor]) vendorMonths[vendor] = {};
    vendorMonths[vendor][monthKey] =
      (vendorMonths[vendor][monthKey] ?? 0) + Math.abs(tx.amount);
  }

  const results: LeakCandidate[] = [];
  const now = new Date();

  // Build the last 4 complete month keys: M-4, M-3, M-2, M-1
  function monthOffset(offset: number): string {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  const refMonths = [monthOffset(-4), monthOffset(-3), monthOffset(-2)];
  const currentMonth = monthOffset(-1);

  const threshold = (context?.alert_thresholds?.price_increase_pct ?? 10) / 100;

  for (const [vendor, monthMap] of Object.entries(vendorMonths)) {
    // Skip trusted vendors
    if (trustedVendors.includes(vendor.toLowerCase())) continue;

    const refValues = refMonths
      .map((m) => monthMap[m])
      .filter((v): v is number => v !== undefined);

    if (refValues.length < 2) continue; // not enough reference data

    const refAvg = refValues.reduce((s, v) => s + v, 0) / refValues.length;
    const current = monthMap[currentMonth];

    if (current === undefined) continue; // no spend this month → not an increase

    const changePct = (current - refAvg) / refAvg;
    if (changePct <= threshold) continue; // not a significant increase

    const excess = current - refAvg;
    const priority: "high" | "medium" = changePct > 0.2 ? "high" : "medium";

    results.push({
      type: "price_increase",
      title: `Hausse fournisseur — ${vendor}`,
      description: `+${Math.round(changePct * 100)}% vs moyenne des 3 derniers mois (${refAvg.toFixed(0)} → ${current.toFixed(0)} CHF).`,
      estimated_savings: Math.round(excess),
      priority,
      vendor,
      trigger_transaction_ids: debits.filter(tx => (tx.vendor ?? tx.description?.slice(0,40)) === vendor && tx.date.slice(0,7) === currentMonth).map(tx => tx.id),
      detection_logic: `Fournisseur "${vendor}" — mois actuel : ${current.toFixed(0)} CHF vs moyenne de référence (${refMonths.filter(m => monthMap[m]).join(', ')}) : ${refAvg.toFixed(0)} CHF — variation : +${Math.round(changePct * 100)}% — seuil configuré : ${Math.round((context?.alert_thresholds?.price_increase_pct ?? 10))}%`,
      comparison_basis: { vendor, current_month: currentMonth, current_amount: current, reference_months: refMonths, reference_avg: Math.round(refAvg), change_pct: Math.round(changePct * 100) },
    });
  }

  return results.sort((a, b) => b.estimated_savings - a.estimated_savings);
}
