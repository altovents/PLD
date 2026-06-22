import type { DbTransaction, LeakCandidate } from "@/lib/types";
import { isStructuralCost } from "./structural-costs";

/**
 * Détecte les services annulés puis réactivés involontairement.
 * Logique : même fournisseur, gap >= 90 jours entre deux transactions.
 */

export function detectGhostReactivations(transactions: DbTransaction[]): LeakCandidate[] {
  const now = new Date();
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const debits = transactions.filter(
    (tx) => tx.amount < 0 && new Date(tx.date) >= twelveMonthsAgo
  );

  // Group by vendor
  const vendorTxs: Record<string, DbTransaction[]> = {};
  for (const tx of debits) {
    const vendor = tx.vendor ?? tx.description?.slice(0, 40);
    if (!vendor) continue;
    if (isStructuralCost(vendor, tx.description ?? "")) continue;
    if (!vendorTxs[vendor]) vendorTxs[vendor] = [];
    vendorTxs[vendor].push(tx);
  }

  const results: LeakCandidate[] = [];

  for (const [vendor, txList] of Object.entries(vendorTxs)) {
    if (txList.length < 3) continue;

    // Sort by date ascending
    const sorted = [...txList].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Skip variable-billing vendors (e.g. OpenAI, AWS usage-based)
    const amounts = sorted.map((tx) => Math.abs(tx.amount));
    const mean = amounts.reduce((s, v) => s + v, 0) / amounts.length;
    if (mean === 0) continue;
    const maxDeviation = Math.max(...amounts.map((a) => Math.abs(a - mean)));
    if (maxDeviation / mean > 0.25) continue;

    // Scan consecutive pairs for a gap >= 90 days
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];

      const prevDate = new Date(prev.date);
      const currDate = new Date(curr.date);
      const gapDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

      if (gapDays < 90) continue;

      const amt = Math.abs(curr.amount);
      const priority: "high" | "medium" | "low" =
        amt > 150 ? "high" : amt > 60 ? "medium" : "low";

      const lastDate = prev.date.slice(0, 10);
      const resumedDate = curr.date.slice(0, 10);

      results.push({
        type: "ghost_reactivation",
        title: `Réactivation fantôme — ${vendor}`,
        description: `${vendor} a été inactif ${Math.round(gapDays)} jours (${lastDate} → ${resumedDate}), puis redébité de ${amt.toFixed(0)} CHF. Vérifier si cette réactivation était intentionnelle.`,
        estimated_savings: Math.round(amt),
        priority,
        vendor,
        trigger_transaction_ids: sorted.slice(i).map((tx) => tx.id),
        detection_logic: `${vendor} — inactif ${Math.round(gapDays)} jours (${lastDate} → ${resumedDate}) — montant reprise : ${amt.toFixed(0)} CHF`,
        comparison_basis: {
          vendor,
          gap_days: Math.round(gapDays),
          last_before_gap: lastDate,
          first_after_gap: resumedDate,
          resumed_amount: amt,
        },
      });

      // Only flag the first gap found per vendor to avoid duplicate alerts
      break;
    }
  }

  return results.sort((a, b) => b.estimated_savings - a.estimated_savings);
}
