import type { DbTransaction, LeakCandidate } from "@/lib/analysis-engine";

/**
 * Détecte les abonnements récurrents dont le coût mensuel peut être optimisé.
 *
 * Logique : un paiement récurrent est identifié quand le même fournisseur
 * apparaît dans 2+ mois distincts sur les 6 derniers mois.
 * On ne peut pas savoir depuis Tink si l'outil est utilisé, donc on présente
 * ces abonnements "à réviser" avec leur coût mensuel moyen.
 *
 * Roadmap: "Récurrence détectée + aucune activité associée"
 */
export function detectUnusedSubscriptions(transactions: DbTransaction[]): LeakCandidate[] {
  const debits = transactions.filter((tx) => tx.amount < 0);

  // Only look at the last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const recent = debits.filter((tx) => new Date(tx.date) >= sixMonthsAgo);

  // Group by vendor → map of month-key → total spent
  const vendorMonths: Record<string, Record<string, number>> = {};

  for (const tx of recent) {
    const vendor = tx.vendor ?? tx.description?.slice(0, 40);
    if (!vendor) continue;

    const monthKey = tx.date.slice(0, 7); // "YYYY-MM"
    if (!vendorMonths[vendor]) vendorMonths[vendor] = {};
    vendorMonths[vendor][monthKey] =
      (vendorMonths[vendor][monthKey] ?? 0) + Math.abs(tx.amount);
  }

  const results: LeakCandidate[] = [];

  for (const [vendor, monthMap] of Object.entries(vendorMonths)) {
    const months = Object.keys(monthMap).sort();
    if (months.length < 2) continue; // not recurring

    const totalSpent = Object.values(monthMap).reduce((s, v) => s + v, 0);
    const avgMonthly = totalSpent / months.length;

    // Filter out low-value noise (< 10 CHF/month)
    if (avgMonthly < 10) continue;

    const priority =
      avgMonthly > 100 ? "high" : avgMonthly > 30 ? "medium" : "low";

    results.push({
      type: "unused_subscription",
      title: `Abonnement récurrent — ${vendor}`,
      description: `Paiement détecté sur ${months.length} mois. Coût moyen : ${avgMonthly.toFixed(0)} CHF/mois. À vérifier si l'outil est encore utilisé.`,
      estimated_savings: Math.round(avgMonthly),
      priority,
      vendor,
    });
  }

  // Sort by estimated savings descending
  return results.sort((a, b) => b.estimated_savings - a.estimated_savings);
}
