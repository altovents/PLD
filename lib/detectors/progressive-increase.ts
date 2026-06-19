import type { DbTransaction, LeakCandidate } from "@/lib/analysis-engine";

/**
 * Détecte les hausses progressives sur 6 mois chez un même fournisseur.
 * Compare la moyenne des 2 premiers mois vs la moyenne des 2 derniers mois.
 * Seuil : > 15% de dérive globale.
 *
 * Roadmap: "Tendance croissante sur 6 mois chez un même fournisseur"
 */
export function detectProgressiveIncreases(
  transactions: DbTransaction[],
  vendorsAlreadyFlagged: Set<string>
): LeakCandidate[] {
  const debits = transactions.filter((tx) => tx.amount < 0);

  // Collect last 6 complete months
  const now = new Date();

  function monthOffset(offset: number): string {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  const window6 = [
    monthOffset(-6),
    monthOffset(-5),
    monthOffset(-4),
    monthOffset(-3),
    monthOffset(-2),
    monthOffset(-1),
  ];

  // Group by vendor → month → total
  const vendorMonths: Record<string, Record<string, number>> = {};

  for (const tx of debits) {
    const vendor = tx.vendor ?? tx.description?.slice(0, 40);
    if (!vendor) continue;
    const monthKey = tx.date.slice(0, 7);
    if (!window6.includes(monthKey)) continue;
    if (!vendorMonths[vendor]) vendorMonths[vendor] = {};
    vendorMonths[vendor][monthKey] =
      (vendorMonths[vendor][monthKey] ?? 0) + Math.abs(tx.amount);
  }

  const results: LeakCandidate[] = [];

  for (const [vendor, monthMap] of Object.entries(vendorMonths)) {
    // Skip vendors already flagged by price_increase (avoid double-counting)
    if (vendorsAlreadyFlagged.has(vendor)) continue;

    const presentMonths = window6.filter((m) => monthMap[m] !== undefined);
    if (presentMonths.length < 5) continue; // need enough data points

    // Early months: first 2, recent months: last 2
    const early = [window6[0], window6[1]]
      .map((m) => monthMap[m])
      .filter((v): v is number => v !== undefined);
    const recent = [window6[4], window6[5]]
      .map((m) => monthMap[m])
      .filter((v): v is number => v !== undefined);

    if (early.length < 1 || recent.length < 1) continue;

    const earlyAvg = early.reduce((s, v) => s + v, 0) / early.length;
    const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length;

    const drift = (recentAvg - earlyAvg) / earlyAvg;
    if (drift <= 0.15) continue; // less than 15% total drift → not significant

    const yearlyExcess = Math.round((recentAvg - earlyAvg) * 12);

    results.push({
      type: "progressive_increase",
      title: `Hausse progressive — ${vendor}`,
      description: `+${Math.round(drift * 100)}% de dérive sur 6 mois (${earlyAvg.toFixed(0)} → ${recentAvg.toFixed(0)} CHF/mois). Impact annuel estimé : ${yearlyExcess} CHF.`,
      estimated_savings: yearlyExcess,
      priority: "low",
      vendor,
    });
  }

  return results.sort((a, b) => b.estimated_savings - a.estimated_savings);
}
